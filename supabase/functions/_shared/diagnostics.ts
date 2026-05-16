// supabase/functions/_shared/diagnostics.ts

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type DiagLevel = 'info' | 'warn' | 'error'

export interface DiagRow {
  user_id: string | null
  stage: string
  level: DiagLevel
  message: string
  details?: string | null
}

// Best-effort logger — never throws. If insert fails, we just console.error.
export class Diagnostics {
  private client: SupabaseClient
  private userId: string | null
  private buffer: DiagRow[] = []

  constructor(supabaseUrl: string, supabaseServiceKey: string, userId: string | null) {
    this.client = createClient(supabaseUrl, supabaseServiceKey)
    this.userId = userId
  }

  log(stage: string, level: DiagLevel, message: string, details?: unknown) {
    const detailsStr =
      details === undefined ? null
      : typeof details === 'string' ? details.slice(0, 4000)
      : safeJson(details).slice(0, 4000)

    const row: DiagRow = {
      user_id: this.userId,
      stage,
      level,
      message: message.slice(0, 1000),
      details: detailsStr,
    }
    this.buffer.push(row)
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      `[diag:${stage}] ${level} ${message}`,
      detailsStr ?? ''
    )
  }

  async flush() {
    if (this.buffer.length === 0) return
    const rows = this.buffer
    this.buffer = []
    try {
      const { error } = await this.client.from('pipeline_diagnostics').insert(rows)
      if (error) console.error('[diag] flush insert error:', error.message)
    } catch (err) {
      console.error('[diag] flush threw:', err)
    }
  }
}

function safeJson(obj: unknown): string {
  try { return JSON.stringify(obj) } catch { return String(obj) }
}
