import Image from "next/image";

export default function NavBar() {
  return (
    <nav className="bg-indigo-500">
      <>
        <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <div className="flex flex-1 items-center sm:items-stretch sm:justify-start">
              <a href="https://guestography.com">
                <div className="flex flex-shrink-0 items-center text-white">
                  <Image
                    className="mr-4"
                    src="/logo.png"
                    alt="Guestography"
                    height={40}
                    width={40}
                  />
                  <span className="text-xl font-medium">Guestography</span>
                </div>
              </a>
            </div>
          </div>
        </div>
      </>
    </nav>
  );
}
