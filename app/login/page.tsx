import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "21M Internal Market Terminal | Sign In",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "invalid_credentials";
  const nextPath = params.next || "/";

  return (
    <main className="min-h-screen bg-black text-orange-200 font-mono flex items-center justify-center p-4">
      <section className="w-full max-w-md border border-orange-500 bg-neutral-950 p-6 shadow-[0_0_20px_rgba(249,115,22,0.35)]">
        <p className="text-xs text-orange-400 tracking-wider">PRIVATE ACCESS</p>
        <h1 className="text-xl mt-2 text-orange-300">21M Internal Market Terminal</h1>
        <p className="text-xs text-neutral-400 mt-2">Authorized team members only.</p>

        <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
          <input type="hidden" name="next" value={nextPath} />

          <label className="block text-xs text-orange-300">
            Username
            <input
              name="username"
              type="text"
              required
              className="mt-1 w-full bg-black border border-orange-600 px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              autoComplete="username"
            />
          </label>

          <label className="block text-xs text-orange-300">
            Password
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full bg-black border border-orange-600 px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              autoComplete="current-password"
            />
          </label>

          {hasError && <p className="text-xs text-red-400">Invalid credentials.</p>}

          <button
            type="submit"
            className="w-full bg-orange-500 text-black text-sm font-bold py-2 hover:bg-orange-400 transition-colors"
          >
            Sign In
          </button>
        </form>
      </section>
    </main>
  );
}
