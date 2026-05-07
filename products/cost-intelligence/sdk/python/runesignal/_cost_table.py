"""
Current model pricing table (per million tokens).
Update this file when providers change pricing.
"""

from typing import TypedDict


class ModelPricing(TypedDict):
    input: float    # $ per M input tokens
    output: float   # $ per M output tokens
    cached: float   # $ per M cached input tokens (0 if not supported)


# fmt: off
PRICING: dict[str, ModelPricing] = {
    # ── OpenAI ──────────────────────────────────────────────────────
    "gpt-4o":                   {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-2024-11-20":        {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-2024-08-06":        {"input": 2.50,  "output": 10.00, "cached": 1.25},
    "gpt-4o-mini":              {"input": 0.15,  "output": 0.60,  "cached": 0.075},
    "gpt-4o-mini-2024-07-18":   {"input": 0.15,  "output": 0.60,  "cached": 0.075},
    "gpt-4.1":                  {"input": 2.00,  "output": 8.00,  "cached": 0.50},
    "gpt-4.1-mini":             {"input": 0.40,  "output": 1.60,  "cached": 0.10},
    "gpt-4.1-nano":             {"input": 0.10,  "output": 0.40,  "cached": 0.025},
    "gpt-4-turbo":              {"input": 10.00, "output": 30.00, "cached": 0.0},
    "gpt-4":                    {"input": 30.00, "output": 60.00, "cached": 0.0},
    "gpt-3.5-turbo":            {"input": 0.50,  "output": 1.50,  "cached": 0.0},
    "o1":                       {"input": 15.00, "output": 60.00, "cached": 7.50},
    "o1-mini":                  {"input": 3.00,  "output": 12.00, "cached": 1.50},
    "o3":                       {"input": 10.00, "output": 40.00, "cached": 2.50},
    "o3-mini":                  {"input": 1.10,  "output": 4.40,  "cached": 0.55},
    "o4-mini":                  {"input": 1.10,  "output": 4.40,  "cached": 0.275},

    # ── Anthropic ───────────────────────────────────────────────────
    "claude-3-5-sonnet-20241022": {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-3-5-sonnet-20240620": {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-3-5-sonnet":          {"input": 3.00,  "output": 15.00, "cached": 0.30},
    "claude-3-5-haiku-20241022":  {"input": 0.80,  "output": 4.00,  "cached": 0.08},
    "claude-3-5-haiku":           {"input": 0.80,  "output": 4.00,  "cached": 0.08},
    "claude-3-opus-20240229":     {"input": 15.00, "output": 75.00, "cached": 1.50},
    "claude-3-opus":              {"input": 15.00, "output": 75.00, "cached": 1.50},
    "claude-3-haiku-20240307":    {"input": 0.25,  "output": 1.25,  "cached": 0.03},
    "claude-opus-4":              {"input": 15.00, "output": 75.00, "cached": 1.50},
    "claude-sonnet-4":            {"input": 3.00,  "output": 15.00, "cached": 0.30},

    # ── Google Gemini ────────────────────────────────────────────────
    "gemini-2.5-pro":             {"input": 1.25,  "output": 10.00, "cached": 0.3125},
    "gemini-2.5-flash":           {"input": 0.075, "output": 0.30,  "cached": 0.01875},
    "gemini-2.0-flash":           {"input": 0.075, "output": 0.30,  "cached": 0.01875},
    "gemini-2.0-flash-lite":      {"input": 0.075, "output": 0.30,  "cached": 0.0},
    "gemini-1.5-pro":             {"input": 1.25,  "output": 5.00,  "cached": 0.3125},
    "gemini-1.5-flash":           {"input": 0.075, "output": 0.30,  "cached": 0.01875},
}
# fmt: on


def calculate_cost(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
    reasoning_tokens: int = 0,
) -> float:
    """Return cost in USD. Falls back to gpt-4o pricing for unknown models."""
    pricing = PRICING.get(model) or PRICING.get(model.split(":")[0])
    if not pricing:
        # Unknown model — use gpt-4o as a conservative estimate and log warning
        pricing = PRICING["gpt-4o"]

    # Cached tokens replace regular input tokens — charge at cached rate
    regular_input = max(0, input_tokens - cached_tokens)
    cost = (
        (regular_input * pricing["input"])
        + (cached_tokens * pricing["cached"])
        + (output_tokens * pricing["output"])
        + (reasoning_tokens * pricing["output"])  # reasoning billed as output
    ) / 1_000_000

    return round(cost, 8)
