import dataclasses
import importlib
import logging
import subprocess
import sys
from collections.abc import Callable
from pathlib import Path
from shutil import rmtree

from algokit_utils.config import config
from dotenv import load_dotenv

config.configure(debug=True, trace_all=False)
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s %(levelname)-10s: %(message)s")
load_dotenv()
root_path = Path(__file__).parent


@dataclasses.dataclass
class SmartContract:
    path: Path
    name: str
    deploy: Callable[[], None] | None = None


def import_contract(folder: Path) -> Path:
    p = folder / "contract.py"
    if p.exists():
        return p
    raise Exception(f"Contract not found in {folder}")


def import_deploy_if_exists(folder: Path) -> Callable[[], None] | None:
    try:
        m = importlib.import_module(f"{folder.parent.name}.{folder.name}.deploy_config")
        return m.deploy
    except ImportError:
        return None


contracts = [
    SmartContract(path=import_contract(f), name=f.name, deploy=import_deploy_if_exists(f))
    for f in root_path.iterdir()
    if f.is_dir() and (f / "contract.py").exists() and not f.name.startswith("_")
]


def build(output_dir: Path, contract_path: Path) -> None:
    if output_dir.exists():
        rmtree(output_dir)
    output_dir.mkdir(parents=True)
    r = subprocess.run(
        ["algokit", "--no-color", "compile", "python", str(contract_path), f"--out-dir={output_dir}", "--output-source-map"],
        capture_output=True,
        text=True,
    )
    print(r.stdout or r.stderr)
    if r.returncode:
        raise Exception(r.stdout)
    for spec in output_dir.glob("*.arc56.json"):
        subprocess.run(
            ["algokit", "generate", "client", str(output_dir), "--output", str(output_dir / "community_donation_hub_client.py")],
            check=True,
        )


def main(action: str, contract_name: str | None = None) -> None:
    arts = root_path / "artifacts"
    for c in contracts:
        if contract_name and c.name != contract_name:
            continue
        if action in ("build", "all"):
            build(arts / c.name, c.path)
        if action in ("deploy", "all") and c.deploy:
            c.deploy()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "all", sys.argv[2] if len(sys.argv) > 2 else None)
