// @ts-ignore — @tanstack/react-start/api is resolved by Vite, not tsc
import { createAPIFileRoute } from '@tanstack/react-start/api'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const APIRoute = createAPIFileRoute('/api/scan-receipt')({
  POST: async ({ request }: { request: Request }) => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let image: string
    try {
      const body = await request.json() as { image?: string }
      image = body.image ?? ''
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    try {

    const mediaTypeMatch = image.match(/^data:(image\/[a-z]+);base64,/)
    const mediaType = (mediaTypeMatch?.[1] ?? 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    const base64Data = image.includes(',') ? image.split(',')[1] : image

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Look at this receipt and extract the purchased items. For each item, return:
- name: the product name (clean, title case)
- quantity: number purchased (default 1 if not clear)
- unit: the unit (default "units")

Ignore non-food/supply items like taxes, fees, totals, store info.
Focus on food, water, medical supplies, and household supplies that belong in an emergency preparedness inventory.

Respond ONLY with valid JSON in this exact format:
{"items": [{"name": "string", "quantity": number, "unit": "string"}]}`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'Could not parse items from receipt' }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
})
