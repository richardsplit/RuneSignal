# @runesignal/crewai-plugin

RuneSignal integration for CrewAI.

> **Status:** Coming soon. Subscribe to updates at https://runesignal.io/sdk

## Planned API

```python
from runesignal.crewai import RuneSignalObserver

# Add RuneSignal observer to any CrewAI crew
crew = Crew(
    agents=[...],
    tasks=[...],
    observers=[RuneSignalObserver(api_key=os.environ["TL_API_KEY"])]
)
```
