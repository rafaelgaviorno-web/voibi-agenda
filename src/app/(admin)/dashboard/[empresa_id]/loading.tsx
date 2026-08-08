export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Carregando...</p>
      </div>
    </div>
  );
}
