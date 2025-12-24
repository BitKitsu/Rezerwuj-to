{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "mikro-saas-dev-shell";

  buildInputs = with pkgs; [
    dotnet-sdk_8
    dotnet-ef
    nodejs_20
    git
  ];

  # Environment tweaks for dotnet tooling
  shellHook = ''
    export DOTNET_ROOT=${pkgs.dotnet-sdk_8}
    export PATH="$DOTNET_ROOT/bin:$PATH"
    export ASPNETCORE_ENVIRONMENT=Development
    echo "[dev-shell] dotnet: $(dotnet --version), node: $(node --version)"
  '';
}
