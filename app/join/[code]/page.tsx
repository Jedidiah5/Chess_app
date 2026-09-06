import { JoinPage } from "@/components/game/JoinPage";

type PageProps = {
  params: Promise<{ code: string }>;
};

export default async function JoinRoutePage({ params }: PageProps) {
  const { code } = await params;
  return <JoinPage code={code} />;
}
