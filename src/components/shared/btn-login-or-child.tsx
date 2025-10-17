import { ReactNode } from "react";
import { SignInButton, useUser } from "@clerk/clerk-react";

const BtnLoginOrChild = ({ children }: { children: ReactNode }) => {
  const { isSignedIn } = useUser();

  if (!isSignedIn) {
    return <SignInButton mode="modal">{children}</SignInButton>;
  }

  return <>{children}</>;
};

export default BtnLoginOrChild;
