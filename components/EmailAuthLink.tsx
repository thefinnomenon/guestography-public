import { FormEventHandler, useCallback, useState } from "react";
import { sendEmailSignInLink } from "../firebase/authentication";

const EmailLinkAuth: React.FC = () => {
  const [status, setStatus] = useState("none");
  const [error, setError] = useState();

  const onSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault();

      const target = event.currentTarget;
      const data = new FormData(target);
      const email = data.get("email") as string;

      setStatus("loading");

      try {
        await sendEmailSignInLink(email);
        setStatus("success");
      } catch (error) {
        // @ts-ignore
        setError(error);
      }
    },
    []
  );

  if (status === "success") {
    return <span>Yay, link successfully sent!</span>;
  }

  return (
    <form className={"w-full"} onSubmit={onSubmit}>
      <div className={"flex flex-col space-y-2"}>
        <label>
          <label>
            Email Address
            <input
              data-cy={"email-input"}
              required
              type="email"
              placeholder={"your@email.com"}
              name={"email"}
            />
          </label>
        </label>

        <button>
          {status === "loading" ? "Sending Email Link..." : "Send Email Link"}
        </button>
      </div>

      {!error && <span>Sorry, we encountered an error</span>}
    </form>
  );
};

export default EmailLinkAuth;
