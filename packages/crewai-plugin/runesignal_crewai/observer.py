"""
RuneSignal CrewAI Observer

Intercepts all CrewAI task executions and:
  1. Evaluates each task action through the RuneSignal firewall
  2. Signs task starts/completions into the provenance ledger
  3. Routes high-risk actions through HITL approval

Usage::

    from runesignal_crewai import RuneSignalObserver
    from crewai import Crew

    crew = Crew(
        agents=[...],
        tasks=[...],
        observers=[RuneSignalObserver(api_key="rs_live_...")],
    )
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

try:
    from runesignal import RuneSignalClient, EvaluateRequest, CertifyRequest
except ImportError:
    raise ImportError(
        "The RuneSignal CrewAI plugin requires 'runesignal'. "
        "Install with: pip install runesignal runesignal-crewai"
    )


class RuneSignalObserver:
    """
    CrewAI observer that applies RuneSignal governance to every task execution.
    Drop into any Crew without modifying agent or task definitions.
    """

    def __init__(
        self,
        api_key: str,
        agent_id: Optional[str] = None,
        base_url: str = "https://app.runesignal.ai",
        block_on_firewall: bool = True,
    ):
        self._client = RuneSignalClient(api_key=api_key, agent_id=agent_id, base_url=base_url)
        self._block_on_firewall = block_on_firewall

    def _run(self, coro: Any) -> Any:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, coro)
                    return future.result()
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    def on_task_start(self, task: Any, agent: Any) -> None:
        """Called by CrewAI when a task begins execution."""
        try:
            result = self._run(
                self._client.firewall.evaluate(EvaluateRequest(
                    action=getattr(task, "description", str(task))[:200],
                    resource="crewai:task",
                    agent_id=getattr(agent, "id", None),
                    metadata={"task": str(task)[:500]},
                ))
            )

            if result.verdict == "block" and self._block_on_firewall:
                raise PermissionError(
                    f"[RuneSignal] Task blocked by firewall: {'; '.join(result.reasons)}"
                )

            if result.verdict == "escalate" and result.hitl_ticket_id:
                ticket = self._run(self._client.approvals.poll(result.hitl_ticket_id))
                if ticket.status != "approved":
                    raise PermissionError(
                        f"[RuneSignal] Task {ticket.status} by human reviewer."
                    )

            # Sign task start into ledger
            self._run(self._client.provenance.certify(CertifyRequest(
                provider="custom",
                model="crewai",
                prompt=f"task_start:{getattr(task, 'description', str(task))[:500]}",
                completion="started",
                metadata={"event": "task_start"},
            )))
        except PermissionError:
            raise
        except Exception as e:
            print(f"[RuneSignal] on_task_start non-fatal error: {e}")

    def on_task_complete(self, task: Any, output: str) -> None:
        """Called by CrewAI when a task completes."""
        try:
            self._run(self._client.provenance.certify(CertifyRequest(
                provider="custom",
                model="crewai",
                prompt=f"task_complete:{getattr(task, 'description', str(task))[:200]}",
                completion=str(output)[:2000],
                metadata={"event": "task_complete"},
            )))
        except Exception as e:
            print(f"[RuneSignal] on_task_complete non-fatal error: {e}")

    def on_task_error(self, task: Any, error: Exception) -> None:
        """Called by CrewAI when a task raises an exception."""
        try:
            self._run(self._client.incidents.create(
                title=f"CrewAI task error: {type(error).__name__}",
                description=str(error)[:500],
                category="agent_misbehaviour",
                severity="medium",
                reported_by="crewai-observer",
            ))
        except Exception as e:
            print(f"[RuneSignal] on_task_error non-fatal error: {e}")
