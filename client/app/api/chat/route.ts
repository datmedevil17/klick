import { streamText, type UIMessage, convertToModelMessages } from "ai"
import { cookieRateLimiter, ipRateLimiter } from "@/lib/rate-limit"
import { ipAddress } from '@vercel/functions'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

export async function POST(req: Request) {
  const ip = ipAddress(req) || 'unknown'

  const cookieStore = await cookies()
  const session = cookieStore.get('session')

  if (session) {

  const { success: cookieSuccess } = await cookieRateLimiter.limit(`cookie:${session?.value}`)

  if (!cookieSuccess) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Please wait before sending another message.",
      }),
      {
        status: 429,
      },
    )
  }
  } else {
    cookieStore.set('session', nanoid())
  }

  const { success: ipSuccess } = await ipRateLimiter.limit(`ip:${ip}`)


  if (!ipSuccess) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Please wait before sending another message.",
      }),
      {
        status: 429,
      },
    )
  }

  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-5.1",
    messages: convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
