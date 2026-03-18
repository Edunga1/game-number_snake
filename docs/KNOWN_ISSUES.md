# Known Issues

## 1. Decay 시스템 비활성화 상태

**상태:** 기능 구현 완료, 현재 OFF

**현상:**
일정 거리(16칸) 이동 시 꼬리 끝 세그먼트를 제거하는 decay 시스템이 구현되어 있지만, 난이도 조절을 위해 비활성화해둔 상태. 나중에 플레이 모드(하드 모드 등) 선택에 따라 활성화할 예정.

**관련 파일:**
- `src/systems/DecaySystem.ts` — decay 로직 (코드 유지)
- `src/core/Game.ts` — `@ts-ignore reserved for hard mode` 주석으로 DecaySystem 인스턴스 유지

---

## 2. DEBUG: 스페이스 키 M 아이템 스폰

**상태:** 개발용, 릴리즈 전 제거 필요

**현상:**
플레이 중 스페이스 키를 누르면 M 아이템이 강제 스폰됨.

**관련 파일:**
- `src/core/Game.ts` — `spawnMergeItem()` 메서드 및 keydown 핸들러
