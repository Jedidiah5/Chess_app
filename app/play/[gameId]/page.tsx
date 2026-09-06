import { OnlineGamePage } from "@/components/game/OnlineGamePage";

type PageProps = {
  params: Promise<{ gameId: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { gameId } = await params;
  return <OnlineGamePage gameId={gameId} />;
}
