# Pohi AI Pro

https://pohiaipro.netlify.app 

## Environment Setup

### Local Development

1. Create a `.env` file in the root directory
2. Add your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

### Netlify Deployment

1. Go to your Netlify dashboard
2. Navigate to Site settings > Environment variables
3. Add the following environment variable:
   - Key: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key

### Security Notes

- The API key is only accessible during build time
- It's embedded in the client bundle but obfuscated
- For production applications, consider using a backend proxy for API calls
- Never commit API keys to version control

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Netlify

The site is automatically deployed when you push to the main branch.