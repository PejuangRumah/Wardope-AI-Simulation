# Claude AI - Outfit Recommendation Guidelines

## Overview

This document outlines the do's and don'ts for the AI (GPT-4o) when generating outfit recommendations for the Wardope AI platform. These guidelines ensure consistent, high-quality, and stylistically appropriate outfit combinations that meet user expectations and business requirements.

**AI Model**: GPT-4o (gpt-4o-2024-08-06)
**Output Format**: Structured JSON Schema (strict mode)
**Prompt Template Location**: `src/lib/services/outfit-generator.ts` → `getDefaultPromptTemplate()`

---

## ✅ DO's - Best Practices

### 1. Outfit Structure & Composition

**DO** create complete, wearable outfits:
- **Full Body Items (Dress/Jumpsuit)**: Can be standalone OR layered with outerwear/accessories
- **Regular Outfits**: MUST include at minimum:
  - Top (or Outerwear as top layer)
  - Bottom
  - Footwear
- **Optional Additions**: Outerwear and Accessories (highly recommended for completeness)

**DO** ensure practical combinations:
- Items should work together functionally (e.g., don't pair formal shoes with athletic wear)
- Consider weather appropriateness (e.g., outerwear for cold weather occasions)
- Ensure items can physically be worn together (e.g., no two pairs of shoes)

### 2. Color Harmony & Aesthetics

**DO** follow color theory principles:
- **Complementary**: Colors opposite on the color wheel (e.g., blue + orange)
- **Analogous**: Adjacent colors (e.g., blue + green + teal)
- **Monochromatic**: Different shades of the same color (e.g., light blue + navy)
- **Neutral Base**: Use neutrals (black, white, grey, beige) as foundation colors
- **Pop of Color**: One accent item to add visual interest

**DO** consider color contrast:
- Light + dark combinations for visual balance
- Avoid clashing colors (e.g., red + orange unless intentional)
- Consider skin tone compatibility (when gender/occasion suggests formal wear)

### 3. Occasion Appropriateness

**DO** match formality level to occasion:
- **Casual**: Relaxed fit, comfortable fabrics (jeans, t-shirts, sneakers)
- **Formal**: Tailored pieces, dress shoes, refined accessories (suits, dress shirts, heels)
- **Work/Office**: Professional, clean lines, conservative colors
- **Party/Events**: Statement pieces, bold colors, trendy items
- **Semi-Formal**: Balance between casual and formal
- **Lounge/Relax**: Comfort-first, soft fabrics, loose fits

**DO** respect cultural and professional norms:
- Business attire should be conservative and polished
- Formal events require elevated styling
- Consider seasonal appropriateness

### 4. Style Coherence

**DO** maintain consistent aesthetic throughout the outfit:
- **Casual**: All items should feel relaxed (no formal shoes with casual wear)
- **Formal**: All items should elevate the look (no sneakers with suits)
- **Sporty**: Athletic wear should be cohesive
- **Bohemian**: Flowy, earthy items work together
- **Minimalist**: Clean lines, simple silhouettes

**DO** consider fit consistency:
- Oversized top + fitted bottom (balanced proportions)
- Fitted top + loose bottom (balanced proportions)
- Avoid all oversized or all tight-fitted (unflattering)

### 5. Reasoning & Explanations

**DO** provide clear, specific reasoning:
- Explain WHY items work together (color, style, occasion)
- Reference specific item attributes (color names, subcategories)
- Describe the overall vibe/aesthetic of the combination
- Mention how items complement each other

**Example**:
```
"The navy blue blazer provides structure and professionalism,
perfectly complementing the crisp white shirt. The khaki chinos
balance the formality while maintaining comfort for a full workday.
Brown leather loafers tie the earthy tones together, creating a
polished yet approachable work/office look."
```

### 6. Background Color Recommendations

**DO** recommend 3-5 Instagram Story-ready background colors:
- **Complement outfit palette**: Colors that enhance, not clash
- **Provide contrast**: Ensure outfit items are visible against background
- **Variety**: Include neutral, bold, and soft options
- **Hex codes**: Provide exact color codes (e.g., #F5F5DC)
- **Descriptive names**: Use evocative names (e.g., "Soft Cream", "Muted Sage")

**Example**:
```json
"background_colors": [
  { "hex": "#F5F5DC", "name": "Warm Beige" },
  { "hex": "#2C3E50", "name": "Deep Navy" },
  { "hex": "#ECF0F1", "name": "Soft Cloud" },
  { "hex": "#E8D5C4", "name": "Desert Sand" }
]
```

### 7. Confidence Levels

**DO** assess and indicate confidence honestly:
- **High**: Perfect match, all items work seamlessly
- **Medium**: Good combination with minor trade-offs
- **Low**: Limited options, best available given constraints

### 8. User Preferences

**DO** respect user notes when provided:
- Color preferences (e.g., "prefer blue colors")
- Style preferences (e.g., "minimalist aesthetic")
- Avoid items (e.g., "no dresses")
- Special requirements (e.g., "comfortable for travel")

---

## ❌ DON'Ts - Common Mistakes to Avoid

### 1. Outfit Structure Violations

**DON'T** create incomplete outfits:
- ❌ Top + Accessories only (missing bottom and footwear)
- ❌ Bottom + Footwear only (missing top)
- ❌ Single item combinations (unless it's a full-body dress/jumpsuit)

**DON'T** violate combination rules:
- ❌ Combining two full-body items (e.g., dress + jumpsuit)
- ❌ Including multiple items from same category incorrectly (e.g., two pairs of shoes)

### 2. Color & Style Clashes

**DON'T** ignore color harmony:
- ❌ Clashing colors (e.g., bright red + bright orange without intention)
- ❌ Too many competing patterns (stripes + florals + polka dots)
- ❌ All items same exact color (boring, lacks dimension)

**DON'T** mix incompatible styles:
- ❌ Formal blazer + athletic shorts
- ❌ Evening gown + sneakers (unless specifically requested for avant-garde look)
- ❌ Business suit + flip-flops

### 3. Occasion Mismatches

**DON'T** violate occasion expectations:
- ❌ Casual t-shirt for formal event
- ❌ Ball gown for casual coffee outing
- ❌ Gym wear for work/office
- ❌ Beach sandals for party/events

### 4. Poor Reasoning

**DON'T** provide vague or generic reasoning:
- ❌ "This outfit looks good" (too generic)
- ❌ "Nice colors" (not specific)
- ❌ "Trendy combination" (lacks explanation)

**DO provide specific reasoning**:
- ✅ "The emerald green blouse creates a sophisticated pop of color against the neutral beige trousers"

### 5. Background Color Mistakes

**DON'T** recommend inappropriate backgrounds:
- ❌ Same color as outfit (poor visibility)
- ❌ Clashing colors that create visual discord
- ❌ Only one type (e.g., all dark or all light)
- ❌ Missing hex codes or descriptive names

### 6. Technical Violations

**DON'T** break JSON schema requirements:
- ❌ Missing required fields (`id`, `category`, `subcategory`, `color`, `reason`)
- ❌ Invalid confidence values (must be: "low", "medium", or "high")
- ❌ Incorrect data types (e.g., number instead of string)
- ❌ Extra fields not in schema (strict mode will reject)

### 7. Quantity Issues

**DON'T** create too few or too many combinations:
- ❌ Less than 3 combinations (insufficient variety)
- ❌ More than 5 combinations (overwhelming for user)
- ✅ Aim for 3-5 combinations per request

### 8. Ignoring Available Items

**DON'T** recommend items not in the wardrobe:
- ❌ Inventing items or suggesting purchases
- ❌ Hallucinating item IDs or descriptions
- ✅ Only use items from the provided `Available wardrobe items` list

---

## 🔧 Technical Requirements

### JSON Schema Compliance

**Required Output Structure**:
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
        }
      ],
      "reasoning": "Overall combination explanation",
      "style_notes": "Additional styling tips",
      "confidence": "high",
      "background_colors": [
        {
          "hex": "#F5F5DC",
          "name": "Soft Beige"
        }
      ]
    }
  ]
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `id` | number | ✅ | Unique per combination |
| `items` | array | ✅ | Minimum 1 item (dress) or 3 items (top+bottom+footwear) |
| `items[].id` | string | ✅ | Must match wardrobe item ID |
| `items[].category` | string | ✅ | Valid: Top, Bottom, Footwear, Outerwear, Accessory |
| `items[].subcategory` | string | ✅ | From wardrobe data |
| `items[].color` | string | ✅ | From wardrobe data |
| `items[].reason` | string | ✅ | Specific explanation (50-150 chars) |
| `reasoning` | string | ✅ | Overall combination reasoning |
| `style_notes` | string | ✅ | Styling tips or suggestions |
| `confidence` | string | ✅ | Enum: "low", "medium", "high" |
| `background_colors` | array | ✅ | 3-5 color recommendations |
| `background_colors[].hex` | string | ✅ | Valid hex code (e.g., #FFFFFF) |
| `background_colors[].name` | string | ✅ | Descriptive name |

---

## 📚 Reference Materials

### System Prompt Template
The current system prompt can be found in:
```
src/lib/services/outfit-generator.ts → getDefaultPromptTemplate()
```

### Template Variables
- `{{occasion}}`: User-selected occasion (e.g., "casual", "formal")
- `{{note}}`: Optional user preferences (e.g., "prefer blue colors")

### Wardrobe Categories
- **Top**: Shirt, T-Shirt, Blouse, Tank Top, Sweater, etc.
- **Bottom**: Jeans, Trousers, Skirt, Shorts, etc.
- **Footwear**: Sneakers, Boots, Heels, Sandals, Loafers, etc.
- **Outerwear**: Jacket, Blazer, Coat, Cardigan, etc.
- **Accessory**: Bag, Hat, Scarf, Belt, Jewelry, etc.

---

## 🎯 Success Criteria

A successful outfit recommendation should:

1. ✅ Be **complete and wearable** (minimum items met)
2. ✅ Match the **occasion** appropriately
3. ✅ Demonstrate **color harmony** and style coherence
4. ✅ Include **specific, clear reasoning** for each item
5. ✅ Provide **3-5 background colors** with hex codes
6. ✅ Follow **JSON schema** strictly (no errors)
7. ✅ Respect **user preferences** from note field
8. ✅ Show **appropriate confidence** level

---

## 📝 Notes for Developers

- This document should be updated whenever the system prompt template changes
- Template location: `src/lib/services/outfit-generator.ts` (line 9-39)
- JSON schema location: `src/lib/services/outfit-generator.ts` (line 100-157)
- For testing, use the existing CSV files: `src/lib/files/Affiliate Items - Mens.csv` and `Affiliate Items - Womens.csv`

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0
**Maintained by**: Wardope AI Development Team
