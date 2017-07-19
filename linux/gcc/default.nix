{ nixpkgs, host, binutils, headers }:

let
  isl = nixpkgs.isl_0_14;
  inherit (nixpkgs) stdenv lib fetchurl;
  inherit (nixpkgs) gmp libmpc libelf mpfr zlib;
in

stdenv.mkDerivation rec {
  name = "gcc-${gcc_version}-${host}";

  gcc_version = "6.3.0";
  gcc_src = fetchurl {
    url = "mirror://gnu/gcc/gcc-${gcc_version}/gcc-${gcc_version}.tar.bz2";
    sha256 = "17xjz30jb65hcf714vn9gcxvrrji8j20xm7n33qg1ywhyzryfsph";
  };

  musl_version = "1.1.16";
  musl_src = nixpkgs.fetchurl {
    url = "https://www.musl-libc.org/releases/musl-${musl_version}.tar.gz";
    sha256 = "048h0w4yjyza4h05bkc6dpwg3hq6l03na46g0q1ha8fpwnjqawck";
  };

  inherit host headers;

  builder = ./builder.sh;  # TODO: keep simplifying this script

  patch_dir = ./patches;

  gcc_patches = [
    ./use-source-date-epoch.patch
    ./libstdc++-target.patch
    ./no-sys-dirs.patch
    ./cppdefault.patch
  ];

  buildInputs = [ binutils ];

  gcc_conf =
    "--target=${host} " +
    "--with-gnu-as " +
    "--with-gnu-ld " +
    "--with-as=${binutils}/bin/${host}-as " +
    "--with-ld=${binutils}/bin/${host}-ld " +
    "--with-isl=${isl} " +
    "--with-gmp-include=${gmp.dev}/include " +
    "--with-gmp-lib=${gmp.out}/lib " +
    "--with-libelf=${libelf}" +
    "--with-mpfr=${mpfr.dev} " +
    "--with-mpfr-include=${mpfr.dev}/include " +
    "--with-mpfr-lib=${mpfr.out}/lib " +
    "--with-mpc=${libmpc.out} " +
    "--with-zlib=${zlib.dev}" +
    "--with-zlib-lib=${zlib.out}" +
    "--enable-deterministic-archives " +
    "--enable-languages=c,c++ " +
    "--enable-libstdcxx-time " +
    "--enable-static " +
    "--enable-tls " +
    "--disable-gnu-indirect-function " +
    "--disable-libmudflap " +
    "--disable-libmpx " +
    "--disable-libsanitizer " +
    "--disable-multilib " +
    "--disable-shared " +
    "--disable-werror";

  musl_conf =
    "--target=${host} " +
    "--disable-shared";

  hardeningDisable = [ "format" ];

  meta = {
    homepage = http://gcc.gnu.org/;
    license = lib.licenses.gpl3Plus;
  };
}

# TODO: does this use /usr/include/stdio.h at any point?  I think it might, so
# try adding #error to it or building in a sandbox

# TODO: fix xgcc; it searches directories outside of the Nix store for libraries
