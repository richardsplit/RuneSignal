# @trustlayer/crewai-plugin

TrustLayer integration for CrewAI.

> **Status:** Coming soon. Subscribe to updates at https://trustlayer.io/sdk

## Planned API

```python
from trustlayer.crewai import TrustLayerObserver

# Add TrustLayer observer to any CrewAI crew
crew = Crew(
    agents=[...],
    tasks=[...],
    observers=[TrustLayerObserver(api_key=os.environ["TL_API_KEY"])]
)
```
