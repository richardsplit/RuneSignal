# @trustlayer/autogen-plugin

TrustLayer integration for Microsoft AutoGen.

> **Status:** Coming soon. Subscribe to updates at https://trustlayer.io/sdk

## Planned API

```python
from trustlayer.autogen import TrustLayerMiddleware

# Wrap AutoGen conversation manager
manager = TrustLayerMiddleware.wrap(
    GroupChatManager(groupchat=groupchat, llm_config=llm_config),
    api_key=os.environ["TL_API_KEY"]
)
```
