export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full min-h-[50vh]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-10 h-10 border-4 border-zinc-800 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-zinc-400">Carregando...</p>
      </div>
    </div>
  );
}
