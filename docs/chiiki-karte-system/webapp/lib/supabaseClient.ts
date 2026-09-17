import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabaseクライアントのファクトリ。
 *
 * この段階では職員認証（Supabase Auth）を実装していないため、匿名キーのみで
 * サーバーコンポーネント・クライアントコンポーネントの両方から同じクライアントを使う。
 * RLSポリシー（supabase/migrations/0001_init.sql）が読み書きの範囲を制御する。
 * 認証を導入する際は、サーバー側は @supabase/ssr の createServerClient に置き換え、
 * ユーザーのセッションに応じたポリシーへ差し替えること。
 */
export function getSupabaseClient() {
  if (!url || !anonKey) {
    throw new Error(
      "Supabaseの接続情報が設定されていません。.env.local に NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください（.env.example 参照）。"
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
