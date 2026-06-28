import { NextResponse } from "next/server"
import { dbQuery } from "@/lib/db"

export const runtime = "nodejs"
export const preferredRegion = ["iad1"]

export async function GET() {
  try {
    const result = await dbQuery<{ now: string }>(
      "select now()::text as now"
    )

    return NextResponse.json({
      ok: true,
      message: "Connected to Neon PostgreSQL",
      serverTime: result.rows[0]?.now ?? null,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to connect to database"

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 }
    )
  }
}
