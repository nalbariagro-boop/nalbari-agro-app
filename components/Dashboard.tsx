type Props = {
  totalLeaf: number;
  totalPayable: number;
  outstanding: number;
  totalParties: number;
};

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
      <p className="text-slate-500 text-sm">{title}</p>
      <p className="text-3xl font-bold text-green-900 mt-2">
        {value}
      </p>
    </div>
  );
}

export default function Dashboard({
  totalLeaf,
  totalPayable,
  outstanding,
  totalParties,
}: Props) {
  return (
    <div className="grid md:grid-cols-4 gap-4">
      <Card title="Today Total Leaf" value={totalLeaf.toFixed(2)} />
      <Card title="Today Payable" value={`₹ ${totalPayable.toFixed(2)}`} />
      <Card title="Outstanding Due" value={`₹ ${outstanding.toFixed(2)}`} />
      <Card title="Total Parties" value={String(totalParties)} />
    </div>
  );
}