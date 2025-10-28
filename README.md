# Wardope AI - Outfit Recommendation POC

AI-powered wardrobe styling with semantic search and cost transparency. This proof-of-concept demonstrates how OpenAI's embeddings and GPT-4o can create intelligent outfit recommendations from wardrobe data.

## Tech Stack

- **SvelteKit 2** - Full-stack web framework
- **Svelte 5** - Reactive UI framework
- **TypeScript** - Type-safe JavaScript
- **OpenAI API** - Embeddings (text-embedding-3-small) + GPT-4o
- **OpenAI Guardrails** - Input validation and prompt injection protection
- **csv-parse** - CSV parsing library
- **Vite** - Next-generation build tool

## Features

- 📤 CSV wardrobe upload (men/women)
- 🎯 Occasion-based outfit recommendations
- 🔍 Semantic search using vector embeddings
- 🛡️ Input validation with OpenAI Guardrails (prompt injection protection)
- 💰 Real-time cost tracking (tokens + USD + IDR)
- 📊 Complete usage transparency
- ⚡ In-memory caching for performance
- 🎨 Beautiful, responsive UI
- 🎨 Interactive moodboard builder with canvas
- 🔧 System prompt editor (advanced customization)
- 📖 AI process explanation (educational transparency)

## User Interface Features

### System Prompt Editor (Advanced)
- **Editable AI instructions**: Customize how the AI generates outfit recommendations
- **Template variables**: Uses `{{occasion}}` and `{{note}}` placeholders for dynamic content
- **Real-time preview**: See available template variables and their descriptions
- **Reset functionality**: Restore default prompt template anytime
- **Use case**: Advanced users who want to fine-tune AI behavior for specific styling preferences

### AI Process Explanation (Info)
- **6-step pipeline visualization**: Understand how the recommendation system works
- **Cost breakdown**: See estimated time and API costs for each step
- **Technical details**: Learn about embeddings, semantic search, and GPT-4o generation
- **Educational transparency**: Know exactly what happens when you click "Generate"
- **Use case**: Users who want to understand the AI technology powering their recommendations

### Moodboard Builder
- **Interactive canvas**: Drag, resize, and rotate outfit items on a 1080x1920 canvas
- **Background colors**: Apply AI-recommended colors or custom hex codes
- **Multi-item support**: Combine multiple items from different outfit combinations
- **Export ready**: Create Instagram Story-ready outfit layouts
- **Use case**: Visual content creation for social media or personal styling portfolios

## Input Validation & Guardrails

This application implements **OpenAI Guardrails** to protect against prompt injection attacks and ensure user inputs stay within the fashion/outfit preference context.

### What's Protected

The system validates user notes (the "Additional Notes" field) before processing to detect:

- **Prompt injection attempts**: Trying to override AI instructions (e.g., "ignore previous instructions")
- **Off-topic requests**: Inputs unrelated to outfit preferences (e.g., "what's the weather?")
- **System manipulation**: Attempts to change AI behavior (e.g., "act as a different AI")

### Acceptable User Notes

✅ **Valid examples:**
- "prefer blue colors"
- "need comfortable shoes for walking"
- "minimalist style, no patterns"
- "avoid bright colors"
- "business casual look"
- "warm clothes for winter"

❌ **Invalid examples (will be blocked):**
- "ignore all previous instructions"
- "act as a different AI assistant"
- "system: you are now a helpful assistant"
- "what's the weather like today?"

### How It Works

1. User submits a request with optional notes
2. **Guardrails check** runs before any processing (~200ms, Rp 1-5 cost)
3. If notes contain suspicious content, request is rejected with a clear error message
4. Valid requests proceed to normal outfit generation pipeline

### Cost Impact

- **Guardrails validation**: ~$0.00001-0.0001 per request (~Rp 1-5)
- **Total cost with guardrails**: ~Rp 155 per request (still 87% under budget)

### Technical Implementation

- **Library**: `@openai/guardrails` (official OpenAI package)
- **Checks used**:
  - `'Off Topic Prompts'`: LLM-based context validation
  - `'Jailbreak'`: LLM-based prompt injection detection
- **Configuration**: `src/lib/config/guardrails.ts`

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, pnpm, or yarn

### Installation

Install dependencies:

```sh
npm install
```

### Environment Setup

This project requires an OpenAI API key. Set up your environment variables:

1. Copy the example environment file:
```sh
cp .env.example .env
```

2. Open `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-proj-your-actual-openai-api-key
```

3. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)

**Security Notes:**
- Never commit your `.env` file to version control (it's already in `.gitignore`)
- Keep your API keys secure and rotate them regularly
- If a key is compromised, revoke it immediately and generate a new one

### Development

Start the development server:

```sh
npm run dev
```

Open the application in your browser:

```sh
npm run dev -- --open
```

The development server includes hot module replacement (HMR) for a smooth development experience.

### Type Checking

Run TypeScript type checking:

```sh
npm run check
```

Watch mode for continuous type checking:

```sh
npm run check:watch
```

## Building for Production

Create a production build:

```sh
npm run build
```

Preview the production build locally:

```sh
npm run preview
```

## Project Structure

```
wardope-ai/
├── src/
│   ├── lib/
│   │   ├── constants/
│   │   │   └── wardrobe-master.ts    # Categories, colors, occasions, fits
│   │   ├── services/
│   │   │   ├── openai.ts             # OpenAI client setup
│   │   │   ├── embeddings.ts         # Embedding creation & caching
│   │   │   ├── vector-search.ts      # Semantic search logic
│   │   │   └── outfit-generator.ts   # GPT-4o outfit generation
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   ├── utils/
│   │   │   ├── csv-parser.ts         # CSV parsing & validation
│   │   │   └── cost-calculator.ts    # Token cost calculation
│   │   └── files/
│   │       ├── Affiliate Items - Mens.csv
│   │       └── Affiliate Items - Womens.csv
│   └── routes/
│       ├── +page.svelte              # Main UI
│       └── api/
│           └── recommend/
│               └── +server.ts        # API endpoint
├── .env.example                      # Environment template
└── package.json
```

## How It Works - Technical Flow

> **💡 User-Friendly Explanation**: The application includes an interactive "How AI Recommendation Works" dropdown that explains this technical process in a visual, easy-to-understand format. Click the "Show" button in the UI to see the 6-step pipeline with cost breakdowns and timing estimates.

### 1. User Input
```
- Gender: men/women
- CSV File: Wardrobe items (id, desc, category, subcategory, color, etc.)
- Occasion: casual, formal, work/office, party/events, etc.
- Note (optional): User preferences (e.g., "prefer blue colors")
```

### 2. Backend Processing Pipeline

#### Step 2.0: Input Validation with Guardrails (~200ms)
```typescript
// Validate user notes before processing (automatic via GuardrailsOpenAI)
// If notes contain prompt injection or off-topic content:
throw GuardrailTripwireTriggered({
  message: "Your note contains content that doesn't match outfit preferences."
});
// Otherwise, continue to next step
```

**Purpose**: Protect against prompt injection attacks and ensure notes stay in fashion context

**Cost**: ~$0.00001 (Rp 1-5), minimal impact

**Checks**:
- Off-topic prompts (LLM-based validation)
- Jailbreak detection (pattern matching)

#### Step 2.1: CSV Parsing (~50ms)
```typescript
// Parse CSV file to JSON array
const items = parseCSV(csvText);
// Validate required fields: id, desc, category, subcategory, color
const { valid, invalid } = validateWardrobeItems(items);
```

#### Step 2.2: Create Embeddings (~1-2s)
```typescript
// For each wardrobe item, create embedding text
const embeddingText = `
  Category: ${category}
  Type: ${subcategory}
  Description: ${desc}
  Colors: ${color}
  Occasions: ${occasion}
  Fit: ${fit}
`;

// Call OpenAI Embeddings API (text-embedding-3-small)
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: embeddingText
});

// Cache in memory for performance
embeddingsCache.set(itemId, embedding);
```

**Cost**: ~$0.0001 for 86 items (cached for 1 hour)

#### Step 2.3: Query Embedding (~200ms)
```typescript
// Create embedding for user query
const queryText = `${occasion} outfit ${note}`;
const queryEmbedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: queryText
});
```

**Cost**: ~$0.00001

#### Step 2.4: Semantic Search (~100ms)
```typescript
// Calculate cosine similarity between query and all items
function cosineSimilarity(a, b) {
  // dot product / (norm(a) * norm(b))
}

// Rank items by similarity
const ranked = items
  .map(item => ({
    ...item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding)
  }))
  .sort((a, b) => b.similarity - a.similarity);

// Balance by category (ensure variety)
const selected = {
  tops: ranked.filter(i => i.category === 'Top').slice(0, 15),
  bottoms: ranked.filter(i => i.category === 'Bottom').slice(0, 15),
  footwear: ranked.filter(i => i.category === 'Footwear').slice(0, 8),
  outerwear: ranked.filter(i => i.category === 'Outerwear').slice(0, 8),
  accessories: ranked.filter(i => i.category === 'Accessory').slice(0, 5)
};
// Total: ~40-50 items sent to AI
```

#### Step 2.5: GPT-4o Combination (~3-5s)
```typescript
// Send filtered items to GPT-4o with structured output
const response = await openai.chat.completions.create({
  model: 'gpt-4o-2024-08-06',
  messages: [
    {
      role: 'system',
      content: `You are a fashion stylist. Create 3-5 outfit combinations for: ${occasion}.
                Consider: color harmony, occasion appropriateness, style coherence.`
    },
    {
      role: 'user',
      content: `Available items: ${JSON.stringify(selectedItems)}`
    }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: { /* structured output schema */ }
  }
});
```

**Input tokens**: ~2,000 (40 items × 50 tokens avg)
**Output tokens**: ~500 (3-5 combinations with reasoning)
**Cost**: ~$0.01

#### Step 2.6: Cost Calculation
```typescript
const costs = {
  embedding_cost: (embeddingTokens / 1_000_000) * 0.02,
  gpt_input_cost: (promptTokens / 1_000_000) * 2.5,
  gpt_output_cost: (completionTokens / 1_000_000) * 10,
  total_cost_usd: sum(all),
  total_cost_idr: total_cost_usd * 15000
};
```

### 3. Response
```json
{
  "combinations": [
    {
      "id": 1,
      "items": [
        {
          "id": "3",
          "category": "Top",
          "subcategory": "Shirt",
          "color": "Blue",
          "reason": "Professional blue shirt perfect for business settings"
        },
        {
          "id": "28",
          "category": "Bottom",
          "subcategory": "Chinos",
          "color": "Khaki",
          "reason": "Khaki chinos complement the blue top elegantly"
        }
      ],
      "reasoning": "This combination balances professionalism with comfort...",
      "confidence": "high"
    }
  ],
  "usage": {
    "embedding_tokens": 3500,
    "prompt_tokens": 2000,
    "completion_tokens": 500,
    "total_tokens": 6000,
    "embedding_cost_usd": 0.00007,
    "gpt_input_cost_usd": 0.005,
    "gpt_output_cost_usd": 0.005,
    "total_cost_usd": 0.01007,
    "total_cost_idr": 151,
    "processing_time_ms": 4523
  },
  "metadata": {
    "gender": "men",
    "occasion": "work/office",
    "total_items": 86,
    "items_considered": 43
  }
}
```

## Cost Analysis

### Per Request Breakdown
| Stage | Tokens | Cost (USD) | Cost (IDR) |
|-------|--------|------------|------------|
| Guardrails validation | ~20 | $0.00001 | Rp 0.15 |
| Embeddings (cached) | ~3,500 | $0.00007 | Rp 1 |
| Query embedding | ~50 | $0.00001 | Rp 0.15 |
| GPT-4o input | ~2,000 | $0.005 | Rp 75 |
| GPT-4o output | ~500 | $0.005 | Rp 75 |
| **Total** | **~6,070** | **~$0.01002** | **~Rp 150** |

### Budget Compliance
- **Target budget**: Rp 1,250 per request
- **Actual cost**: Rp 150 per request
- **Margin**: 88% under budget ✅
- **Pricing per coin**: Rp 2,000 (user pays)
- **Profit margin**: ~Rp 1,850 per request

## Production Migration Path

| POC (SvelteKit) | Production (Backend API) |
|-----------------|--------------------------|
| CSV upload → parse in memory | PostgreSQL with wardrobe table |
| In-memory embeddings cache | pgvector extension (persistent) |
| Embeddings created on-demand | Pre-computed on item creation |
| Gender selection per request | User profile has gender |
| **OpenAI API logic** | **EXACTLY THE SAME** ✅ |

### Key Architecture Points
1. **Embeddings**: Created once per item, stored in DB
2. **Vector search**: pgvector extension for fast similarity search
3. **API structure**: Same request/response format
4. **Cost tracking**: Same calculation logic
5. **Scalability**: Works with 10k+ items per user

## API Usage Tracking

### Token Usage (from response)
Every OpenAI API response includes usage data:
```json
{
  "usage": {
    "prompt_tokens": 2000,
    "completion_tokens": 500,
    "total_tokens": 2500
  }
}
```

### Checking Remaining Balance
OpenAI does NOT provide an official API endpoint for balance checking. Options:
1. **Manual**: Check at https://platform.openai.com/usage
2. **Usage API** (Dec 2024): `GET /v1/usage?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
3. **Costs endpoint**: `GET /v1/dashboard/billing/costs`

## Testing

### Quick Test
```bash
# 1. Start dev server
npm run dev

# 2. Open http://localhost:5173

# 3. Test with existing CSV
- Select "Men"
- Upload: src/lib/files/Affiliate Items - Mens.csv
- Occasion: "casual"
- Note: "prefer blue colors"
- Click "Generate"

# 4. Verify results
- Check combinations
- Check token usage
- Check cost (should be ~Rp 150-200)
```

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Ensure `.env` file exists with `OPENAI_API_KEY=sk-proj-...`
- Restart dev server after creating `.env`

### "CSV parsing failed"
- Verify CSV has required columns: id, desc, category, subcategory, color
- Check for proper UTF-8 encoding
- Ensure no empty required fields

### High API costs
- Check embeddings cache is working (should not recreate on every request)
- Verify category balancing (should send ~40-50 items max to GPT)
- Monitor token usage in response

## Learn More

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [SvelteKit Documentation](https://svelte.dev/docs/kit)
- [Vector Search Explained](https://www.pinecone.io/learn/vector-similarity/)
