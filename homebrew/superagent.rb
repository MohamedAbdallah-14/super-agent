class Superagent < Formula
  desc "Host-native engineering OS kit for AI coding agents"
  homepage "https://github.com/MohamedAbdallah-14/super-agent"
  url "https://registry.npmjs.org/@superagent-os/cli/-/cli-0.1.0.tgz"
  sha256 "b2458bb7d1e98d47e166265c156dbee22342de68aa42b89ea544b367d91108ef"
  license "MIT"

  depends_on "node@22"

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink libexec.glob("bin/*")
  end

  test do
    assert_match "superagent", shell_output("#{bin}/superagent --help")
  end
end
