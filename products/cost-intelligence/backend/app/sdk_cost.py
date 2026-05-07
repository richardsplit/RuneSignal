"""
Re-export the cost calculation table for use inside the FastAPI backend.
Keeps the SDK and the backend in sync on pricing without duplication.
"""
import sys, os

# The SDK lives at products/cost-intelligence/sdk/python
_SDK_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "sdk", "python")
if _SDK_PATH not in sys.path:
    sys.path.insert(0, _SDK_PATH)

try:
    from runesignal._cost_table import calculate_cost, PRICING  # noqa: F401
except ImportError:
    # Fallback inline implementation if SDK not installed
    def calculate_cost(model, input_tokens, output_tokens, cached_tokens=0, reasoning_tokens=0):
        # gpt-4o pricing as fallback
        return round(
            (max(0, input_tokens - cached_tokens) * 2.50
             + cached_tokens * 1.25
             + (output_tokens + reasoning_tokens) * 10.00) / 1_000_000,
            8,
        )

    PRICING = {}

# Alias used in proxy_middleware
_calculate_cost_from_usage = calculate_cost
