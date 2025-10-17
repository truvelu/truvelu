import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_chatLayout/l/{-$learningId}")({
  component: RouteComponent,
  beforeLoad: (context) => {
    if (!context.params.learningId) {
      throw redirect({
        to: "/",
      });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/l/-$learningId"!</div>;
}
