import { Header } from "@/components/layout/Header";
import { IssueMap } from "@/components/map/IssueMap";
import { getMunicipalities } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const municipalities = await getMunicipalities();

  return (
    <>
      <Header title="地域課題マップ" subtitle="大阪府内市町村の8指標を俯瞰します" />
      <section className="flex-1 overflow-y-auto p-6">
        <div className="mb-4">
          <h3 className="text-[19px] font-display font-bold">地域課題マップ</h3>
          <p className="mt-1 max-w-xl text-sm text-ink-muted">
            国土地理院の地図上に市町村を配置し、選択した指標のスコアで色分け表示します。円をクリックすると市町村カルテに移動します。
          </p>
        </div>
        <IssueMap municipalities={municipalities} />
      </section>
    </>
  );
}
