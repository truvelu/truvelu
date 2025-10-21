import { SignInButton, useUser } from "@clerk/clerk-react";
import type { ReactNode } from "react";

const BtnLoginOrChild = ({ children }: { children: ReactNode }) => {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return <SignInButton mode="modal">{children}</SignInButton>;
  }

  return <>{children}</>;
};

export default BtnLoginOrChild;
