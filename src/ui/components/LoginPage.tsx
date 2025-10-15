import { useState } from "react";
import { Button, Input, Card, CardBody, CardHeader } from "@nextui-org/react";
import {
  EyeIcon,
  EyeSlashIcon,
  UserIcon,
  LockClosedIcon,
} from "@heroicons/react/20/solid";

interface LoginPageProps {
  onLogin?: ({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call the onLogin callback if provided
      if (onLogin) {
        await onLogin({ username, password });
      }
    } catch (error) {
      console.error("Login failed 1:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800  dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="flex flex-col items-center pb-6">
          <img
            className="w-16 h-16 mb-4"
            src="img/blob-salute.png"
            alt="Logo"
          />
          <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
          <p className="text-small text-default-500 text-center">
            Sign in to your account
          </p>
        </CardHeader>

        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-danger-50 border border-danger-200 text-danger-700 text-sm">
                {error}
              </div>
            )}

            <Input
              type="text"
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              startContent={<UserIcon className="w-4 h-4 text-default-400" />}
              variant="bordered"
              isRequired
              autoComplete="username"
            />

            <Input
              type={isPasswordVisible ? "text" : "password"}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={
                <LockClosedIcon className="w-4 h-4 text-default-400" />
              }
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={togglePasswordVisibility}
                >
                  {isPasswordVisible ? (
                    <EyeSlashIcon className="w-4 h-4 text-default-400 pointer-events-none" />
                  ) : (
                    <EyeIcon className="w-4 h-4 text-default-400 pointer-events-none" />
                  )}
                </button>
              }
              variant="bordered"
              isRequired
              autoComplete="current-password"
            />

            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              isDisabled={!username.trim() || !password.trim()}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
