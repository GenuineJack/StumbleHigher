export function SystemConfig() {
  return (
    <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
      <h2 className="text-xl font-bold text-white mb-4">System Configuration</h2>
      <p className="text-zinc-400">
        System configuration panel will be implemented here. This will include:
      </p>
      <ul className="list-disc list-inside text-zinc-400 mt-2 space-y-1">
        <li>Submission cost settings</li>
        <li>Auto-approval thresholds</li>
        <li>Reward pool distribution percentages</li>
        <li>Content category management</li>
        <li>Platform feature toggles</li>
      </ul>
    </div>
  );
}
