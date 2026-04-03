import { createSupabaseServer } from '@/lib/supabase-server'
import { countryCodeToFlag } from '@/lib/flags'

export default async function AdminFightersPage() {
  const supabase = await createSupabaseServer()

  const { data: fighters, error } = await supabase
    .from('fighters')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="text-sm text-red-400">{error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Fighters</h1>
        <p className="mt-2 text-sm text-gray-400">Current fighter roster.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-950 text-gray-400">
            <tr className="border-b border-gray-800">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Ring Name</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Nationality</th>
              <th className="px-4 py-3">Weight Class</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {fighters?.length ? (
              fighters.map((fighter) => (
                <tr key={fighter.id} className="border-b border-gray-800/70">
                  <td className="px-4 py-3 font-medium text-white">{fighter.name}</td>
                  <td className="px-4 py-3 text-amber-400">{fighter.ring_name ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{fighter.record ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{countryCodeToFlag(fighter.nationality)} {fighter.nationality ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300">{fighter.weight_class ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(fighter.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">
                  No fighters found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
