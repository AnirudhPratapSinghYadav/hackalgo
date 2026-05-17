import pytest
from algokit_utils import AlgorandClient
from algokit_utils.config import config

config.configure(debug=True)


@pytest.fixture(scope="session")
def algorand_client() -> AlgorandClient:
    return AlgorandClient.from_environment()
