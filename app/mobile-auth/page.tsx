import { MobileAuthLauncher } from "../../components/MobileAuthLauncher";

type PageProps = {
  searchParams: {
    state?: string;
  };
};

export default function MobileAuthPage({ searchParams }: PageProps) {
  const state = typeof searchParams?.state === "string" ? searchParams.state : null;
  return <MobileAuthLauncher state={state} />;
}
