# @runesignal/autogen-plugin

RuneSignal integration for Microsoft AutoGen.

> **Status:** Coming soon. Subscribe to updates at https://runesignal.io/sdk

## Planned API

```python
from runesignal.autogen import RuneSignalMiddleware

# Wrap AutoGen conversation manager
manager = RuneSignalMiddleware.wrap(
    GroupChatManager(groupchat=groupchat, llm_config=llm_config),
    api_key=os.environ["TL_API_KEY"]
)
```
