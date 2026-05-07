"""Basic sanity tests for the cost table and track decorator."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from runesignal._cost_table import calculate_cost, PRICING


def test_known_model_cost():
    cost = calculate_cost("gpt-4o-mini", input_tokens=1000, output_tokens=500)
    expected = (1000 * 0.15 + 500 * 0.60) / 1_000_000
    assert abs(cost - expected) < 1e-9


def test_cached_tokens_charged_at_lower_rate():
    cost_no_cache = calculate_cost("gpt-4o", input_tokens=1000, output_tokens=0)
    cost_cached   = calculate_cost("gpt-4o", input_tokens=1000, output_tokens=0, cached_tokens=1000)
    assert cost_cached < cost_no_cache


def test_unknown_model_falls_back():
    cost = calculate_cost("unknown-model-xyz", input_tokens=1000, output_tokens=500)
    assert cost > 0  # falls back to gpt-4o pricing


def test_all_models_have_positive_prices():
    for model, p in PRICING.items():
        assert p["input"] > 0,  f"{model} has non-positive input price"
        assert p["output"] > 0, f"{model} has non-positive output price"
        assert p["cached"] >= 0, f"{model} has negative cached price"


def test_reasoning_tokens_billed_as_output():
    cost_with    = calculate_cost("o1", input_tokens=0, output_tokens=0, reasoning_tokens=1000)
    cost_without = calculate_cost("o1", input_tokens=0, output_tokens=1000, reasoning_tokens=0)
    assert cost_with == cost_without
