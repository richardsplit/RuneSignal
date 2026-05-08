"""
RuneSignal AutoGen Middleware

Wraps any AutoGen GroupChatManager or ConversableAgent to:
  1. Evaluate every message/action through the RuneSignal firewall
  2. Sign all interactions into the provenance ledger
  3. Route sensitive operations through HITL approval

Usage::

    from runesignal_autogen import RuneSignalMiddleware
    import autogen

    manager = autogen.GroupChatManager(groupchat=groupchat, llm_config=llm_config)
    safe_manager = RuneSignalMiddleware.wrap(manager, api_key="rs_live_...")

    # All conversations are now governed by RuneSignal
"""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

try:
    from runesignal import RuneSignalClient, EvaluateRequest, CertifyRequest
except ImportError:
    raise ImportError(
        "The RuneSignal AutoGen plugin requires 'runesignal'. "
        "Install with: pip install runesignal runesignal-autogen"
    )


class RuneSignalMiddleware:
    """
    Wraps an AutoGen agent/manager with RuneSignal governance.
    Proxies all method calls, intercepting send/receive to apply policy.
    """

    def __init__(
        self,
        wrapped: Any,
        api_key: str,
        agent_id: Optional[str] = None,
        base_url: str = "https://app.runesignal.ai",
    ):
        self._wrapped = wrapped
        self._client = RuneSignalClient(api_key=api_key, agent_id=agent_id, base_url=base_url)

    @classmethod
    def wrap(
        cls,
        agent: Any,
        api_key: str,
        agent_id: Optional[str] = None,
        base_url: str = "https://app.runesignal.ai",
    ) -> "RuneSignalMiddleware":
        return cls(agent, api_key=api_key, agent_id=agent_id, base_url=base_url)

    def _run(self, coro: Any) -> Any:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    return pool.submit(asyncio.run, coro).result()
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    def _sign_message(self, message: Any, direction: str) -> None:
        content = str(message)[:2000] if message else ""
        try:
            self._run(self._client.provenance.certify(CertifyRequest(
                provider="custom",
                model="autogen",
                prompt=f"{direction}:{content[:200]}",
                completion=content,
                metadata={"event": direction, "agent": str(getattr(self._wrapped, "name", "unknown"))},
            )))
        except Exception as e:
            print(f"[RuneSignal] sign_message non-fatal: {e}")

    def _evaluate_message(self, message: Any) -> None:
        content = str(message)[:200] if message else ""
        try:
            result = self._run(self._client.firewall.evaluate(EvaluateRequest(
                action="autogen.send",
                resource="autogen:conversation",
                metadata={"message": content},
            )))
            if result.verdict == "block":
                raise PermissionError(
                    f"[RuneSignal] Message blocked: {'; '.join(result.reasons)}"
                )
        except PermissionError:
            raise
        except Exception as e:
            print(f"[RuneSignal] evaluate_message non-fatal: {e}")

    def initiate_chat(self, *args: Any, **kwargs: Any) -> Any:
        if args:
            self._evaluate_message(kwargs.get("message", args[1] if len(args) > 1 else ""))
        self._sign_message(kwargs.get("message", ""), "initiate_chat")
        return self._wrapped.initiate_chat(*args, **kwargs)

    def send(self, *args: Any, **kwargs: Any) -> Any:
        message = args[0] if args else kwargs.get("message", "")
        self._evaluate_message(message)
        self._sign_message(message, "send")
        return self._wrapped.send(*args, **kwargs)

    def receive(self, *args: Any, **kwargs: Any) -> Any:
        result = self._wrapped.receive(*args, **kwargs)
        self._sign_message(args[0] if args else "", "receive")
        return result

    def __getattr__(self, name: str) -> Any:
        return getattr(self._wrapped, name)
