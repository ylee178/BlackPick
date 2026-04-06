import type { Meta } from "@storybook/nextjs-vite";
import { RankDelta, RankingRowCompact, getRankColorClass } from "@/components/ui/ranking";

const meta: Meta = {
  title: "Design System/Rankings",
  parameters: { layout: "centered" },
};
export default meta;

export const DeltaIndicators = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-4">
      <span className="w-16 text-xs text-white/40">New</span>
      <RankDelta value="new" />
    </div>
    <div className="flex items-center gap-4">
      <span className="w-16 text-xs text-white/40">Up +3</span>
      <RankDelta value={3} />
    </div>
    <div className="flex items-center gap-4">
      <span className="w-16 text-xs text-white/40">Down -2</span>
      <RankDelta value={-2} />
    </div>
    <div className="flex items-center gap-4">
      <span className="w-16 text-xs text-white/40">No change</span>
      <RankDelta value={0} />
    </div>
    <div className="flex items-center gap-4">
      <span className="w-16 text-xs text-white/40">Null</span>
      <RankDelta value={null} />
    </div>
  </div>
);

export const RankColors = () => (
  <div className="flex items-center gap-4">
    {[1, 2, 3, 4, 5].map((rank) => (
      <span key={rank} className={`text-lg font-bold ${getRankColorClass(rank)}`}>#{rank}</span>
    ))}
  </div>
);

export const CompactRows = () => (
  <div className="w-80 space-y-1">
    <RankingRowCompact rank={1} name="ChampionOne" value="2,450" unknownLabel="Unknown" delta={2} />
    <RankingRowCompact rank={2} name="SolidStriker" value="1,320" unknownLabel="Unknown" delta={-1} />
    <RankingRowCompact rank={3} name="CardCrusher" value="980" unknownLabel="Unknown" delta={5} />
    <RankingRowCompact rank={4} name="UnderdogEye" value="410" unknownLabel="Unknown" delta={0} />
    <RankingRowCompact rank={5} name="LateNotice" value="290" unknownLabel="Unknown" />
  </div>
);
