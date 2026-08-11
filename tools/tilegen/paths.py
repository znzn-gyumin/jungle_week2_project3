"""출력 경로 해석.

생성기는 두 가지 레이아웃에서 돌아간다.

  ① 배포 레이아웃 (프로젝트에 들어간 상태)
        <repo>/tools/tilegen/*.py
        <repo>/assets/  <repo>/preview/  <repo>/src/
     → OUT = <repo>            (assets/ preview/ 가 루트에 바로 있다)

  ② 개발 레이아웃 (생성기만 따로 둔 상태)
        <dev>/tilegen/*.py
        <dev>/out/assets/ ...
     → OUT = <dev>/out

`tilegen` 의 부모 디렉터리 이름이 `tools` 인지로 구분한다.
환경변수 `JL_OUT` 으로 강제 지정할 수도 있다.

실행 방법 (배포 레이아웃, 저장소 루트에서):
    python -m tools.tilegen.build
    python -m tools.tilegen.qa
    python -m tools.tilegen.previews
"""
import os

_HERE = os.path.dirname(os.path.abspath(__file__))
_PARENT = os.path.dirname(_HERE)

if os.path.basename(_PARENT).lower() == "tools":
    ROOT = os.path.dirname(_PARENT)
    OUT = ROOT
else:
    ROOT = _PARENT
    OUT = os.path.join(ROOT, "out")

OUT = os.environ.get("JL_OUT", OUT)

TSDIR = os.path.join(OUT, "assets", "tilesets")
MAPDIR = os.path.join(OUT, "assets", "map")
PRE = os.path.join(OUT, "preview")
SRCDIR = os.path.join(OUT, "src")
