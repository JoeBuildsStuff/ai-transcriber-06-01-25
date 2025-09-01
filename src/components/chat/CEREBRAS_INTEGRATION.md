# Cerebras API Integration

This project now supports Cerebras API integration alongside the existing Anthropic Claude integration.

## Setup

1. **Get a Cerebras API Key**
   - Visit [Cerebras Cloud](https://cloud.cerebras.net/) and sign up for an account
   - Navigate to "API Keys" in the left navigation bar
   - Create a new API key

2. **Configure Environment Variables**
   Add your Cerebras API key to your environment variables:
   ```bash
   export CEREBRAS_API_KEY="your-api-key-here"
   ```
   
   Or add it to your `.env.local` file:
   ```
   CEREBRAS_API_KEY=your-api-key-here
   ```

## Usage

### In the Chat Interface

1. **Select Cerebras Model**: Choose "GPT-OSS-120B" from the model dropdown
2. **Set Reasoning Effort**: When using Cerebras models, you can select the reasoning effort level:
   - **Low**: Faster responses, less detailed reasoning
   - **Medium**: Balanced speed and reasoning depth
   - **High**: Slower responses, more detailed reasoning and analysis

### API Endpoint

The Cerebras integration is available at `/api/cerebras` and supports:

- **Model**: `gpt-oss-120b` (default)
- **Reasoning Effort**: `low`, `medium`, `high` (default: `low`)
- **Streaming**: Support for streaming responses
- **File Attachments**: Image and file upload support
- **Context**: Page context and conversation history

### Example API Request

```typescript
const formData = new FormData()
formData.append('message', 'Your message here')
formData.append('model', 'gpt-oss-120b')
formData.append('reasoning_effort', 'medium')
formData.append('temperature', '1')
formData.append('top_p', '1')
formData.append('max_completion_tokens', '65536')

const response = await fetch('/api/cerebras', {
  method: 'POST',
  body: formData
})
```

## Features

- **Multiple Model Support**: Switch between Anthropic Claude and Cerebras models
- **Reasoning Effort Control**: Fine-tune the reasoning depth for Cerebras models
- **File Attachments**: Support for images and documents
- **Streaming Responses**: Real-time streaming for better user experience
- **Context Awareness**: Maintains conversation history and page context

## Differences from Anthropic

- **No Tool Calling**: Cerebras models don't support the same tool calling capabilities as Claude
- **Reasoning Effort**: Unique to Cerebras, allows control over reasoning depth
- **Model Parameters**: Different default parameters optimized for Cerebras models

## Troubleshooting

- **API Key Issues**: Ensure `CEREBRAS_API_KEY` is properly set in your environment
- **Model Selection**: Make sure to select a Cerebras model to use the Cerebras API
- **Reasoning Effort**: Only available when using Cerebras models (`gpt-oss-120b`)
