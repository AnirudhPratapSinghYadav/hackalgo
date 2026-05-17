"""Smoke test — compiled DisasterVault artifacts exist."""

from pathlib import Path

ARTIFACT = (
    Path(__file__).resolve().parents[1]
    / "smart_contracts"
    / "artifacts"
    / "disaster_vault"
    / "DisasterVault.arc56.json"
)


def test_arc56_artifact_exists() -> None:
    assert ARTIFACT.is_file(), f"Missing {ARTIFACT}"
