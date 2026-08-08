export default async function AvailabilityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Disponibilidade</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Configure seus horários de trabalho padrão.</p>
        </div>
      </div>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8 text-center mt-8 shadow-sm">
         <p className="text-zinc-500 dark:text-zinc-400 font-medium">Interface de gerenciamento semanal em desenvolvimento.</p>
         <p className="text-sm text-zinc-400 mt-2 max-w-md mx-auto">No MVP atual, ao criar o evento via banco, você pode popular 5 dias úteis (Seg-Sex, 09h às 18h) automaticamente.</p>
      </div>
    </div>
  )
}
