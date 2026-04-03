# Number Snake — Godot 4.3 완전 이식 명세서

> 이 문서는 웹(TypeScript/Canvas)으로 만든 Number Snake 게임을 **Godot 4.3**으로 **디자인과 기능이 100% 동일하게** 재현하기 위한 명세서입니다.
> 이 문서 하나만 보고 구현하면 됩니다.

---

## 목차

1. [게임 개요](#1-게임-개요)
2. [화면 레이아웃 & 좌표계](#2-화면-레이아웃--좌표계)
3. [색상표](#3-색상표)
4. [게임 상태 머신](#4-게임-상태-머신)
5. [뱀(Snake) 메커니즘](#5-뱀snake-메커니즘)
6. [음식(Food) 시스템](#6-음식food-시스템)
7. [충돌 시스템](#7-충돌-시스템)
8. [머지(Merge) 시스템](#8-머지merge-시스템)
9. [라운드 & 스코어링](#9-라운드--스코어링)
10. [입력(Input) 처리](#10-입력input-처리)
11. [렌더링 상세](#11-렌더링-상세)
12. [사운드 디자인](#12-사운드-디자인)
13. [튜토리얼 화면](#13-튜토리얼-화면)
14. [알려진 의도적 설계](#14-알려진-의도적-설계)
15. [Godot 구현 가이드](#15-godot-구현-가이드)

---

## 1. 게임 개요

Number Snake는 숫자를 가진 뱀이 그리드 위를 이동하면서 음식을 먹어 성장하고, 동일한 값의 인접 세그먼트를 머지(합체)하여 점수를 올리는 퍼즐 + 아케이드 게임입니다.

**핵심 규칙:**
- 뱀은 숫자 값을 가진 세그먼트(segment)의 배열
- 음식을 먹으면 꼬리 끝에 해당 음식의 값을 가진 세그먼트가 추가됨
- **머지 아이템(M)**을 먹으면 인접한 동일 값 세그먼트 쌍이 합체 (값 +1)
- 머리(head) 값보다 큰 음식을 먹으면 즉사
- 자기 몸에 부딪히면 즉사
- 라운드별 목표 점수를 달성하면 라운드 클리어
- 그리드는 좌우/상하 모두 래핑(wrapping) — 벽이 없는 토러스 구조

---

## 2. 화면 레이아웃 & 좌표계

### 2.1 기본 치수

```
CELL_SIZE       = 28px (한 셀의 픽셀 크기)
GRID_COLS       = 14   (가로 셀 수)
GRID_ROWS       = 23   (전체 세로 행: HUD 3행 + 플레이 20행)
HUD_ROWS        = 3    (상단 HUD 영역)
PLAY_ROWS       = 20   (플레이 영역)
PLAY_Y_OFFSET   = 3    (플레이 영역 시작 행 인덱스)

GRID_WIDTH      = 14 × 28 = 392px
GRID_HEIGHT     = 23 × 28 = 644px
SIDE_PANEL_WIDTH = 44px   (우측 세그먼트 정보 패널)
CANVAS_WIDTH    = 392 + 44 = 436px
DPAD_AREA_HEIGHT = 150px  (하단 D-pad 영역)
CANVAS_HEIGHT   = 644 + 150 = 794px
```

### 2.2 영역 배치도

```
┌──────────────────────────┬─────────┐
│       HUD (3행 = 84px)   │  Side   │  y: 0~84
│  ROUND / Score / Bar     │  Panel  │
├──────────────────────────┤  44px   │
│                          │         │
│    Play Area (20행)      │  Seg    │  y: 84~644
│    14×20 Grid            │  List   │
│    392 × 560 px          │         │
│                          │         │
├──────────────────────────┴─────────┤
│         D-pad Area (150px)         │  y: 644~794
│   [◀]   [▲][▼]   [▶]              │
└────────────────────────────────────┘
        전체: 436 × 794 px
```

### 2.3 좌표계

- 그리드 좌표: `(col, row)` — col: 0~13, row: 0~22
- 플레이 영역 그리드: col 0~13, row 3~22 (PLAY_Y_OFFSET=3 부터)
- 픽셀 변환: `pixel_x = col × 28`, `pixel_y = row × 28`
- 뱀 시작 위치: `(7, 13)` — 플레이 영역 중앙 (`floor(14/2)`, `3 + floor(20/2)`)

### 2.4 반응형 스케일링

화면 비율 = 436:794 (약 0.549:1). 뷰포트에 맞춰 비율 유지하며 스케일:
```
width  = min(화면너비, 화면높이 × 436/794)
height = min(화면높이, 화면너비 × 794/436)
```

---

## 3. 색상표

### 3.1 배경 & UI

| 용도 | Hex | 설명 |
|------|-----|------|
| 메인 배경 | `#1a1a2e` | 전체 캔버스 배경 |
| HUD / D-pad 배경 | `#0f0f23` | 상단 HUD & 하단 D-pad & 우측 패널 |
| 플레이 그리드 배경 | `#16213e` | 플레이 영역 |
| 그리드 선 | `#0f3460` | 0.5px 격자선 |
| 플레이 영역 테두리 | `#1e4a78` | 2px 외곽선 |
| 텍스트 | `#eee` | 일반 텍스트 |

### 3.2 뱀

| 용도 | Hex |
|------|-----|
| 머리 | `#e94560` |
| 몸통 (값별) | 아래 표 참조 |
| 머리 외곽선 | `#ffffff` (2px stroke) |

### 3.3 세그먼트 값별 색상

| 값 | Hex | 비고 |
|----|-----|------|
| 1 | `#6c5ce7` | 보라 |
| 2 | `#a29bfe` | 연보라 |
| 4 | `#fd79a8` | 핑크 |
| 8 | `#e17055` | 주황 |
| 16 | `#fdcb6e` | 노랑 |
| 32 | `#00b894` | 초록 |
| 64 | `#00cec9` | 청록 |
| 128 | `#e84393` | 진핑크 |
| 256 | `#d63031` | 빨강 |
| 512 | `#ffd32a` | 금색 |
| 1024 | `#ff6b6b` | 연빨강 |
| 기타 | `#fab1a0` | 기본값 |

### 3.4 음식

| 타입 | Hex | 조건 |
|------|-----|------|
| 안전 (일반) | `#4ecca3` (초록) | value ≤ head value |
| 위험 | `#e23e57` (빨강) | value > head value |
| 머지 가능 | `#ffd369` (금색) | value == tail value |
| 가위 (removal) | `#b388ff` (보라) | 특수 아이템 |
| 머지 아이템 (M) | `#ffd700` (금색) | 특수 아이템 |

### 3.5 기타

| 용도 | Hex |
|------|-----|
| 벽 글로우 | `#00d2ff` (시안) |
| 머지 파티클 | `#ffd700` (금색) |
| 라운드 타이틀 | `#00d2ff` |
| 라운드 클리어 텍스트 | `#4ecca3` |

---

## 4. 게임 상태 머신

```
                    ┌──────────┐
                    │  ready   │ ←── 게임 시작 / 라운드 클리어 후
                    └────┬─────┘
                         │ (탭 / 스페이스)
            ┌────────────┼─────────────┐
            │ (첫 시작)  │             │
            │ 튜토리얼   │             │
            │ 표시       │             │
            └────────────┘             │
                    ┌──────────┐       │
                    │ playing  │ ←─────┘
                    └──┬──┬────┘
                       │  │
          머지아이템   │  │  점수 >= 목표
          먹음         │  │
              ┌────────┘  └────────┐
              ▼                    ▼
        ┌──────────┐        ┌────────────┐
        │ merging  │        │ round_clear│
        └────┬─────┘        └──────┬─────┘
             │ (애니메이션 완료)     │ (1.5초 표시 후)
             │                     │
             └──→ playing          └──→ ready (round++)
                  또는 round_clear

        자기충돌 / 위험음식 먹음
              ▼
        ┌──────────┐
        │ game_over│
        └──────────┘
             │ (Restart 버튼)
             └──→ ready (전체 리셋)
```

### 상태별 동작

| 상태 | 설명 |
|------|------|
| `ready` | 오버레이 표시 ("ROUND N" / 튜토리얼). 탭/스페이스로 `playing` 전환 |
| `playing` | 틱마다 뱀 이동, 음식 충돌 처리, 음식 스폰. 일반 게임 플레이 |
| `merging` | 머지 애니메이션 진행 중. 입력 무시. 애니메이션 끝나면 점수 반영 후 `playing` 또는 `round_clear` |
| `round_clear` | 세그먼트 하나씩 팝 → 보너스 표시 → 1.5초 후 다음 라운드 |
| `game_over` | "GAME OVER" + 점수 + Restart 버튼 표시 |

---

## 5. 뱀(Snake) 메커니즘

### 5.1 데이터 구조

```
Snake:
  segments: Array<{pos: Vector2i, value: int}>  # [0]=head, [last]=tail
  direction: Direction (Up=0, Right=1, Down=2, Left=3)
  alive: bool
  distanceSinceDecay: int  # (현재 미사용, 하드모드 예비)
```

### 5.2 방향 벡터

```
Up    = (0, -1)
Right = (1, 0)
Down  = (0, 1)
Left  = (-1, 0)
```

### 5.3 이동 (move)

매 틱(tick)마다:
1. 꼬리부터 머리 방향으로 각 세그먼트 위치를 앞 세그먼트의 위치로 복사
2. 머리 위치 = 현재 머리 + 방향 벡터
3. 머리 위치를 래핑(wrap) 처리
4. `distanceSinceDecay++`

```
for i from (segments.length-1) downto 1:
    segments[i].pos = segments[i-1].pos  (복사)
segments[0].pos = nextHeadPos()
```

### 5.4 먹기 (eat)

음식의 value를 가진 새 세그먼트를 꼬리 끝에 추가:
1. 이동 전 꼬리 위치를 저장 (`oldTailPos`)
2. 일반 move와 동일하게 위치 시프트
3. `segments.push({pos: oldTailPos, value: foodValue})`

### 5.5 래핑 (wrap)

```
if x < 0:           x = GRID_COLS - 1  (= 13)
if x >= GRID_COLS:   x = 0
if y < PLAY_Y_OFFSET: y = PLAY_Y_OFFSET + PLAY_ROWS - 1  (= 22)
if y >= PLAY_Y_OFFSET + PLAY_ROWS: y = PLAY_Y_OFFSET  (= 3)
```

수평/수직 모두 래핑. 벽이 없는 토러스 구조.

### 5.6 시작 상태

- 위치: `(7, 13)` — 세그먼트 1개 (머리만)
- 값: 1
- 방향: Right
- alive: true

---

## 6. 음식(Food) 시스템

### 6.1 음식 타입

| 타입 | value | 모양 | 동작 |
|------|-------|------|------|
| `normal` | 1~N | 원형, 숫자 표시 | 먹으면 꼬리에 세그먼트 추가 |
| `removal` (가위) | 0 | 보라 원형, ✂ 아이콘 | 먹으면 꼬리 세그먼트 1개 제거 |
| `merge` (M) | 0 | 금색 다이아몬드, M 텍스트 | 먹으면 머지 시스템 발동 |

### 6.2 스폰 규칙

**초기 스폰:** 라운드 시작 시 3개 (`FOOD_INITIAL_COUNT`)

**지속 스폰:** 매 2000ms마다 1개씩 추가 (최대 18개, `FOOD_COUNT_MAX`)

**빈 셀 찾기:** 랜덤 좌표를 뱀/음식과 겹치지 않을 때까지 최대 100번 시도

### 6.3 음식 값 결정 알고리즘

**최대 스폰 값:**
```
maxFoodValue = max(3, floor(√(headValue)))
```
- headValue 1~8: 최대 3
- headValue 9~15: 최대 3
- headValue 16~24: 최대 4
- headValue 25~35: 최대 5

**생성 흐름:**

```
1단계: 10% 확률로 merge 아이템 → {value: 0, type: 'merge'} 리턴

2단계: 나머지 90%에서 카테고리 결정
  - Meaningful: 60%
  - Edible:     25%
  - Dangerous:  10%
  - Special:     5%

  (빈 카테고리의 확률은 Meaningful로 재분배)
```

### 6.4 카테고리별 상세

#### Meaningful (60%)
- **풀:** 뱀 세그먼트에 존재하는 값들 중 headValue 이하이면서 maxFoodValue 이하인 것
- **가중치:**
  - 꼬리(tail) 값: 가중치 3
  - 꼬리 바로 앞(second-tail) 값: 가중치 2
  - 나머지: 가중치 1
- 가중치 기반 랜덤 선택

#### Edible (25%)
- **풀:** 1 ~ min(headValue, maxFoodValue) 범위이면서 뱀 세그먼트에 **없는** 값
- 균등 랜덤

#### Dangerous (10%)
- **풀:** headValue+1 ~ min(headValue+3, maxFoodValue)
- **가중치:** 낮은 값일수록 가중치 높음 (headValue+1이 가장 빈번)
  - weights = [poolSize, poolSize-1, poolSize-2, ...]

#### Special (5%)
- 50% 확률: removal 아이템 (가위) → `{value: 0, type: 'removal'}`
- 50% 확률: low outlier (뱀의 최소 세그먼트 값보다 작은 수 중 랜덤)
  - low outlier 풀이 비면 → removal로 폴백

---

## 7. 충돌 시스템

### 7.1 매 틱 실행 순서

```
1. nextPos = wrap(head.pos + direction)
2. food = 해당 위치의 음식 확인
3. selfHit = nextPos가 body 세그먼트(머리 제외)와 겹치는지 확인
4. 판정
```

### 7.2 자기 충돌 규칙

```
if nextPos가 body에 히트:
    if 히트한 것이 tail이고, 이번에 성장하지 않을 경우:
        → 충돌 아님 (tail은 이동으로 빠지므로 OK)
    else:
        → 자기 충돌 → game_over
```

- "성장하지 않을 경우" = 음식이 없거나, removal/merge 타입인 경우
- normal 음식을 먹으면서 tail 위치로 이동하면 → 충돌 (tail이 안 빠지므로)

### 7.3 위험 음식 판정

```
if food.type == 'normal' AND food.value > head.value:
    → 위험 → game_over
```

### 7.4 음식 먹기 처리

| 음식 타입 | 처리 |
|-----------|------|
| `normal` (안전) | `snake.eat(food.value)` → wrap → 효과음 |
| `normal` (위험) | 즉사 → game_over |
| `removal` | `snake.move()` → wrap → 세그먼트 > 1이면 `segments.pop()` → 효과음 |
| `merge` | `snake.move()` → wrap → 머지 시스템 시작. 머지 쌍 있으면 `state = 'merging'` |

---

## 8. 머지(Merge) 시스템

### 8.1 트리거

merge 타입 음식(M)을 먹으면 발동.

### 8.2 그리디 페어링 알고리즘

```
pairs = []
i = 0
while i < segments.length - 1:
    if segments[i].value == segments[i+1].value:
        pairs.push({index: i, resultValue: segments[i].value + 1})
        i += 2  # 두 세그먼트 모두 건너뜀
    else:
        i += 1
```

- 머리부터 꼬리 방향으로 스캔
- 동일 값 인접 쌍을 탐욕적(greedy)으로 매칭
- 한 세그먼트는 한 쌍에만 참여

### 8.3 머지 적용

쌍을 **역순으로** 처리 (인덱스 보존):
```
for each pair (reverse order):
    segments[pair.index].value = pair.resultValue
    segments.splice(pair.index + 1, 1)  # 두 번째 세그먼트 제거
```

### 8.4 위치 압축 (Compact)

머지 후 세그먼트 사이에 간격이 생길 수 있음. 압축 처리:

```
for i from 1 to segments.length-1:
    prev = segments[i-1].pos
    curr = segments[i].pos

    # 래핑 고려 최단 거리 계산
    dx = curr.x - prev.x
    dy = curr.y - prev.y
    if dx > GRID_COLS/2:  dx -= GRID_COLS
    if dx < -GRID_COLS/2: dx += GRID_COLS
    if dy > PLAY_ROWS/2:  dy -= PLAY_ROWS
    if dy < -PLAY_ROWS/2: dy += PLAY_ROWS

    # 이미 인접이면 스킵
    if abs(dx) + abs(dy) == 1: continue

    # 단위 스텝 결정 (큰 축 우선)
    if abs(dx) >= abs(dy):
        sx = sign(dx), sy = 0
    else:
        sx = 0, sy = sign(dy)

    # prev에 인접하도록 배치 (래핑)
    nx = prev.x + sx
    ny = prev.y + sy
    wrap(nx, ny)
    segments[i].pos = (nx, ny)
```

### 8.5 캐스케이드 (연쇄)

머지 적용 + 압축 후 다시 스캔. 새로운 쌍이 있으면 다음 패스(pass) 실행.
쌍이 없을 때까지 반복.

### 8.6 애니메이션

각 패스당:
1. **Glow 단계** (150ms): 머지되는 쌍의 양쪽 세그먼트에 금색 글로우
2. **Shrink 단계** (150ms): 쌍의 두 번째 세그먼트가 축소 (scale: 1.0 → 0.2)
3. 적용 + 압축 → 다음 패스 확인

총 단계 시간: 300ms/패스

### 8.7 점수 계산

```
per merge pair:
    score = 10 × resultValue × 2^(passCount - 1)

passCount는 1부터 시작 (첫 패스 = 1)
```

**예시:**
- 패스1: [2][2] → [3] = 10 × 3 × 1 = 30점
- 패스2 (캐스케이드): [3][3] → [4] = 10 × 4 × 2 = 80점
- 합계: 110점

### 8.8 머지 완료 후 파티클

각 완료된 머지 위치에서 파티클 버스트 생성.

---

## 9. 라운드 & 스코어링

### 9.1 목표 점수

```
Round N 목표 = 600 × 2^(N-1)

Round 1:  600
Round 2:  1,200
Round 3:  2,400
Round 4:  4,800
Round 5:  9,600
...
```

### 9.2 틱 속도

```
tickMs = max(150, 400 - 30 × (round - 1))

Round 1:  400ms
Round 2:  370ms
Round 3:  340ms
...
Round 9+: 150ms (최소값)
```

### 9.3 라운드 클리어 시퀀스

`score >= targetScore` 달성 시 (머지 완료 후 체크):

1. **Popping 단계:**
   - 매 100ms마다 꼬리 세그먼트를 하나씩 제거
   - 제거된 세그먼트의 점수: `value × 10`
   - 제거 시 파티클 버스트 + pop 효과음
   - 머리만 남을 때까지 반복

2. **머리만 남으면:**
   - 라운드 보너스: `round² × 50`
   - 헤드 보너스: `headValue × 10 × round`
   - 위 보너스를 점수에 합산
   - 팡파레 효과음 + 진동(100ms)

3. **Showing 단계:**
   - "ROUND N CLEAR!" + 보너스 금액 표시
   - 1500ms 동안 표시

4. **다음 라운드 전환:**
   - round++
   - 음식 전부 제거 후 3개 재스폰
   - 틱 속도 갱신
   - state → 'ready'
   - (뱀은 현재 상태 유지 — 머리만 남아있음)

### 9.4 게임 오버 → 재시작

- 뱀 리셋 (머리 1개, 값 1, 위치 중앙, 방향 Right)
- 점수 0, 라운드 1
- 음식 전부 제거 후 3개 재스폰
- 튜토리얼 다시 표시
- state → 'ready'

---

## 10. 입력(Input) 처리

### 10.1 키보드

| 키 | 방향 |
|----|------|
| ArrowUp / W / w | Up |
| ArrowRight / D / d | Right |
| ArrowDown / S / s | Down |
| ArrowLeft / A / a | Left |
| Space | 게임 시작 / 튜토리얼 닫기 |

### 10.2 터치 — 조이스틱 (플레이 영역)

- 플레이 그리드 내에서 터치 시작 → 조이스틱 활성화
- 터치 이동 시:
  - 이동 거리 20px 미만: 무시
  - 수평 이동 > 수직 이동: Left/Right
  - 수직 이동 > 수평 이동: Up/Down
- 터치 종료 → 조이스틱 비활성화

### 10.3 터치 — D-pad (하단 영역)

D-pad 버튼 영역에서 터치 → 즉시 방향 입력.

#### D-pad 레이아웃

```
pad = 8, gap = 8
areaH = 150

sideW = 120
sideH = areaH - pad×2 = 134

midL = pad + sideW + gap = 136
midR = CANVAS_WIDTH - pad - sideW - gap = 308
midW = midR - midL = 172
midH = (sideH - gap) / 2 = 63

Up:    {x: 136, y: 652, w: 172, h: 63}
Down:  {x: 136, y: 723, w: 172, h: 63}
Left:  {x: 8,   y: 652, w: 120, h: 134}
Right: {x: 308, y: 652, w: 120, h: 134}
```

- 터치 이동 시 D-pad 영역 내 다른 버튼으로 슬라이딩 가능
- 진동 피드백: 15ms

### 10.4 방향 버퍼링

- 틱당 방향 입력 1개만 저장 (버퍼)
- 반대 방향 입력 무시: `(newDir + 2) % 4 == currentDir` → 무시
- 틱 시작 시 버퍼 소비: `currentDir = bufferedDir`

### 10.5 마우스 (데스크톱 D-pad)

- D-pad 영역 클릭 → 방향 입력
- 마우스 업 → 활성 D-pad 해제

---

## 11. 렌더링 상세

### 11.1 렌더링 순서 (뒤→앞)

1. 전체 배경 (`#1a1a2e`)
2. HUD (상단 3행)
3. 그리드 배경 + 격자선
4. 벽 글로우 테두리
5. 음식
6. 뱀 (몸통 뒤→앞, 마지막에 머리)
7. 파티클 (머지 버스트)
8. 세그먼트 리스트 (우측 패널)
9. D-pad 버튼
10. 조이스틱 (활성 시)
11. 오버레이 (튜토리얼 / 라운드 표시 / 라운드 클리어 / 게임 오버)

### 11.2 HUD 렌더링

- 배경: `#0f0f23`로 채움 (상단 3행 × CANVAS_WIDTH)
- **1행 (y=18):** "ROUND N" — 색: `#00d2ff`, bold 16px monospace, 중앙 정렬
- **2행 (y=44):** "점수 / 목표점수" — 점수=white bold 16px, "/ 목표"=#666 12px monospace
- **3행 (y=68):** 프로그레스 바
  - 배경: `#222`, 둥근 사각형(radius 3), x:10, w:CANVAS_WIDTH-20, h:7
  - 채움: `#00d2ff` (100%면 `#4ecca3`), 글로우 효과 (shadowBlur 6)

### 11.3 그리드 렌더링

- 배경: `#16213e`, 플레이 영역만 (0, 84, 392, 560)
- 격자선: `#0f3460`, 0.5px, 가로/세로 모두
- 외곽: `#1e4a78`, 2px stroke

### 11.4 벽(Wall) 렌더링

- 플레이 영역에 `#00d2ff` 색 테두리
- 2px 두께, shadowBlur 6으로 글로우 효과
- 좌표: `(0.5, 84.5, 391, 559)` — 0.5 오프셋으로 선명한 선

### 11.5 뱀 렌더링

#### 세그먼트 그리기

```
for i from (segments.length-1) downto 0:  # 뒤에서 앞으로
    seg = segments[i]
    isHead = (i == 0)

    # 머지 애니메이션 처리
    if merging and this segment is in a merge pair:
        if glow phase: 금색 글로우 (shadowColor=#ffd700, shadowBlur=15)
        if shrink phase and second of pair: scale = 1 - progress × 0.8

    # 래핑 고스트 (수평만)
    draw at (seg.pos.x × 28, seg.pos.y × 28)
    if seg.pos.x == 0: also draw at (x + 392, y)  # 우측 고스트
    if seg.pos.x == 13: also draw at (x - 392, y)  # 좌측 고스트
```

#### 개별 세그먼트

- **채움:** 둥근 사각형, 1px 안쪽 패딩, 2px 줄임
  - 머리: `#e94560`, radius 8
  - 몸통: 값별 색상, radius 4
- **텍스트:** 값 숫자, white, bold 14px monospace, 중앙
- **머리 전용:**
  - 외곽선: white 2px stroke, padding 2px, radius 8
  - 방향 화살표: 머리 바깥쪽에 삼각형

#### 방향 화살표 (머리)

- 머리 외부에 표시되는 작은 삼각형 (크기 6px)
- 펄싱 애니메이션: `alpha = 0.4 + (t % 800) / 800 × 0.4`
- 색: white
- 방향별 위치:
  - Up: 머리 상단 밖
  - Down: 머리 하단 밖
  - Left: 머리 좌측 밖
  - Right: 머리 우측 밖

### 11.6 음식 렌더링

#### Normal 음식

```
cx, cy = 셀 중심
radius = CELL_SIZE × 0.35 = 9.8px

if value > headValue:
    color = #e23e57 (위험)
    텍스트 = white
    X 마커: 대각선 흰색(30% opacity) 크로스, 2px, 좌상→우하/우상→좌하 (8px 인셋)
elif value == tailValue:
    color = #ffd369 (머지 가능)
    펄싱 글로우: shadowColor=#ffd369, shadowBlur=8+sin(now/200)×4
    텍스트 = 배경색(#1a1a2e)
else:
    color = #4ecca3 (안전)
    텍스트 = 배경색(#1a1a2e)

원형, bold 13px monospace
```

#### Merge 아이템 (M)

```
다이아몬드 형태 (45도 회전 사각형)
color = #ffd700
펄싱 글로우: shadowBlur = 10 + sin(now/250) × 6
텍스트 = "M", 배경색(#1a1a2e), bold 14px monospace
```

#### Removal 아이템 (가위)

```
원형, radius = CELL_SIZE × 0.35
color = #b388ff
펄싱 글로우: shadowBlur = 6 + sin(now/300) × 3
텍스트 = "✂", white, bold 16px sans-serif
```

### 11.7 파티클 시스템

머지 완료/라운드 클리어 시 버스트 생성.

```
spawnBurst(x, y, value):
    count = min(value, 12)
    for i in 0..count:
        angle = 2π × i / count
        speed = 40 + random() × 60
        particle = {
            x: x + CELL_SIZE/2,
            y: y + CELL_SIZE/2,
            vx: cos(angle) × speed,
            vy: sin(angle) × speed,
            life: 1.0,
            decay: 1.5 + random() × 1.0,
            size: 3 + random() × 3,
            color: #ffd700
        }
```

**업데이트 (매 프레임, dt ≈ 1/60):**
```
p.x += p.vx × dt
p.y += p.vy × dt
p.life -= p.decay × dt
if p.life <= 0: remove
```

**렌더링:**
```
alpha = max(0, p.life)
circle at (p.x, p.y), radius = p.size × p.life
color = p.color
```

### 11.8 세그먼트 리스트 (우측 패널)

- 패널 배경: `#0f0f23`, x: 392, w: 44, h: 644
- 연속 동일 값 세그먼트를 그룹으로 묶어 표시
- 최대 표시 그룹: `floor(560 / 20)` = 28개
- 각 그룹:
  - 색상 박스: 14×14px, radius 2, 값별 색상 (첫 그룹은 머리색 `#e94560`)
  - 값 텍스트: white, bold 7px monospace, 박스 중앙
  - 카운트: "xN", `#555`, bold 9px monospace, 우측 정렬
- 시작 Y: playTop + 6 = 90px
- 행 높이: 20px

### 11.9 D-pad 렌더링

- 배경: `#0f0f23`
- 버튼:
  - 비활성: 배경 `rgba(255,255,255,0.06)`, 테두리 `rgba(255,255,255,0.12)` 1.5px
  - 활성: 배경 `rgba(0,210,255,0.25)`, 테두리 `rgba(0,210,255,0.6)` 2px, 2px 안쪽 축소
  - radius: 10px
- 화살표 기호:
  - 비활성: `rgba(255,255,255,0.35)`, bold 24px sans-serif
  - 활성: `rgba(0,210,255,0.9)`, bold 22px sans-serif
- 기호: ▲ ▼ ◀ ▶

### 11.10 조이스틱 렌더링 (터치 활성 시)

- 베이스 원: 반지름 40px, white, alpha 0.25
- 썸 원: 반지름 18px, white, alpha 0.5
- 썸 위치는 베이스 중심에서 최대 40px까지만 (클램핑)
- 좌표는 터치 좌표를 캔버스 좌표로 변환하여 사용

### 11.11 오버레이

#### Ready 오버레이 ("ROUND N")

```
배경: rgba(0,0,0,0.7) — 그리드 영역만 (0,0 ~ CANVAS_WIDTH, GRID_HEIGHT)
타이틀: "ROUND N", #00d2ff, bold 28px monospace, 중앙, y=GRID_HEIGHT/2-20
부제: "Tap or press SPACE to start", #aaa, 14px monospace, y=GRID_HEIGHT/2+20
```

#### Round Clear 오버레이

```
배경: rgba(0,0,0,0.5) — 그리드 영역만
"ROUND N CLEAR!": #4ecca3, bold 28px monospace, y=GRID_HEIGHT/2-30
bonus > 0: "+{bonus} BONUS", #ffd700, bold 20px, y=GRID_HEIGHT/2+10
headBonus > 0: "+{headBonus} HEAD BONUS", #e94560, bold 16px, y=GRID_HEIGHT/2+40
```

#### Game Over 오버레이

```
배경: rgba(0,0,0,0.7) — 그리드 영역만
"GAME OVER": #e94560, bold 28px monospace, y=cy-40 (cy=GRID_HEIGHT/2)
점수: white, bold 24px monospace, y=cy+5

Restart 버튼:
    위치: y=cy+30, 가로 중앙
    크기: 160×32px, radius 8
    배경: rgba(255,255,255,0.1)
    테두리: rgba(255,255,255,0.3), 1px
    텍스트: "Restart", white, 14px monospace
    펄싱: alpha = sin(now/400) × 0.15 + 0.85 (0.70~1.00)
```

---

## 12. 사운드 디자인

모두 프로시저럴(합성) 사운드. Godot에서는 `AudioStreamGenerator` 또는 미리 생성한 짧은 WAV/OGG 사용 권장.

### 12.1 eat — 음식 먹기

```
타입: sine
주파수: 600Hz → 900Hz (exponential ramp)
시간: 60ms ramp + 40ms decay
볼륨: 0.15 → 0.001 (100ms)
```

### 12.2 merge — 머지 완료

```
타입: triangle
주파수: 400Hz → 1200Hz (exponential ramp)
시간: 150ms ramp + 50ms decay
볼륨: 0.12 → 0.001 (200ms)
```

### 12.3 death — 사망

```
타입: sawtooth
주파수: 400Hz → 80Hz (exponential ramp, 하강)
시간: 400ms
볼륨: 0.10 → 0.001 (400ms)
```

### 12.4 pop — 세그먼트 팝 (라운드 클리어)

```
타입: sine
주파수: 800Hz → 400Hz (exponential ramp, 하강)
시간: 60ms ramp + 20ms decay
볼륨: 0.08 → 0.001 (80ms)
```

### 12.5 roundClear — 팡파레 (라운드 클리어 완료)

```
4음 시퀀스:
  C5=523Hz, E5=659Hz, G5=784Hz, C6=1047Hz
  각 음: sine, 200ms, 볼륨 0.12→0.001
  간격: 120ms
```

### 12.6 진동 피드백

| 이벤트 | 진동 시간 |
|--------|-----------|
| D-pad 터치 | 15ms |
| 머지 완료 | 50ms |
| 라운드 클리어 | 100ms |
| 사망 | 200ms |

---

## 13. 튜토리얼 화면

첫 게임 시작 시 (ready 상태에서 `showTutorial == true`) 풀스크린 오버레이로 표시.

### 13.1 레이아웃

```
배경: rgba(0,0,0,0.88) — 전체 캔버스
타이틀: "HOW TO PLAY", #00d2ff, bold 22px monospace, 중앙, y=60

5개의 행으로 구성 (각 행은 상황 → 결과를 시각적으로 보여줌):
```

### 13.2 각 행 상세

셀 크기 S=20px, step=22px (S+2), gap=6px

#### Row 1: 성장 (Grow) — y=130

```
[2][3] ▸ (1) → [1][2][3]  ✓ Grow!

설명: 머리값(3) 이하인 음식(1)을 먹으면 꼬리에 추가되어 성장
색상: 음식=초록(#4ecca3), 결과 배경=초록 글로우
"eat!" 라벨: 음식 위에 표시, 초록색, 9px
```

#### Row 2: 위험 (Danger) — y=200

```
[1][2][3] ▸ (5) → ✗ Death!

설명: 머리값(3)보다 큰 음식(5)을 먹으면 즉사
색상: 음식=빨강(#e94560), "Death!"=빨강
```

#### Row 3: 자기 충돌 — y=270

```
U자형 뱀 배치 (9-segment):
Row0: [1][1][2][1]
Row1: [3]       [2]
Row2:    [1][2][1]

머리[3]가 위로 이동 → [1]과 충돌
X 마커와 펄싱 삼각형 표시
→ ✗ Death!
```

#### Row 4: 머지 (Merge) — y=340+

```
[1][1][1] ▸ (M) → [1][2]  Score!

설명: M 아이템을 먹으면 동일값 인접 세그먼트가 합체
색상: M=금색(#ffd700), 결과 배경=금색 글로우
```

#### Row 5: 가위 (Scissors) — y=410+

```
[1][2][3] ▸ (✂) → [2][3]  Cut!

설명: 가위를 먹으면 꼬리 세그먼트 1개 제거
색상: 가위=보라(#b388ff), 결과 배경=보라 글로우
```

### 13.3 하단

```
"Tap or press SPACE" — 펄싱 텍스트
alpha = sin(now/400) × 0.3 + 0.7
y = GRID_HEIGHT - 30
```

### 13.4 미니 드로잉 스타일

- **세그먼트 박스:** 둥근 사각형, 머리=#e94560 (radius 4, 흰 테두리), 몸통=#533483 (radius 2)
- **음식 원:** radius = S×0.38, 안에 값 숫자
- **M 아이템:** 다이아몬드, 금색, "M" 텍스트 (배경색)
- **가위:** 원, 보라, "✂" 텍스트
- **화살표 (⇒):** white, 20px sans-serif
- **결과 배경:** 반투명 흰색 (8% opacity), 컬러 테두리 (50% opacity), 글로우
- **펄싱 ▸ 바이트 애니메이션:** 삼각형, 800ms 주기, alpha 0.4~0.8

---

## 14. 알려진 의도적 설계

### 14.1 라이프 잃은 후 음식 겹침

뱀 리셋 시 기존 음식이 새 뱀 위치와 겹칠 수 있음. 충돌 체크는 **다음 이동 위치**만 보므로 겹친 음식은 먹히지 않고 시각적으로만 겹침. 의도적으로 보류된 사항.

### 14.2 Removal 블록 Decay 이중 페널티

removal 블록을 먹으면 꼬리 손실 + decay 카운터가 일반 이동과 동일하게 증가. 현재 decay 시스템은 비활성이므로 실질적 영향 없음.

### 14.3 Decay 시스템 (미사용)

구현되어 있지만 게임 루프에서 호출하지 않음. 하드 모드를 위해 예비:
- 16회 이동 동안 음식을 먹지 않으면 꼬리 1개 제거
- 머리만 남으면 라이프 상실

---

## 15. Godot 구현 가이드

### 15.1 프로젝트 설정

- **Godot 버전:** 4.3
- **렌더러:** Mobile (또는 Compatibility)
- **해상도:** 436 × 794 (base), stretch mode: canvas_items, aspect: keep
- **방향:** Portrait

### 15.2 권장 씬 구조

```
Main (Node2D)
├── Background (ColorRect)
├── HUD (Node2D)
│   ├── RoundLabel
│   ├── ScoreLabel
│   └── ProgressBar
├── PlayArea (Node2D)
│   ├── GridBackground (ColorRect)
│   ├── GridLines (Line2D 또는 draw 호출)
│   ├── WallGlow (draw 호출)
│   ├── FoodContainer (Node2D)
│   │   └── (FoodItem scenes)
│   ├── SnakeContainer (Node2D)
│   │   └── (Segment scenes)
│   └── ParticleContainer (Node2D)
├── SidePanel (Node2D)
├── DPad (Node2D)
│   ├── BtnUp / BtnDown / BtnLeft / BtnRight
├── JoystickOverlay (Node2D)
└── OverlayLayer (CanvasLayer)
    ├── TutorialOverlay
    ├── RoundReadyOverlay
    ├── RoundClearOverlay
    └── GameOverOverlay
```

### 15.3 핵심 구현 포인트

#### 게임 루프

Godot의 `_process(delta)` 대신 **고정 타임스텝** 사용:
```gdscript
var accumulator := 0.0
var tick_ms := 400.0

func _process(delta: float) -> void:
    accumulator += delta * 1000.0
    while accumulator >= tick_ms:
        _tick()
        accumulator -= tick_ms
    _render(accumulator / tick_ms)
```

또는 `Timer` 노드를 사용하여 틱 간격을 제어.

#### 그리드 기반 렌더링

- 모든 위치는 그리드 좌표 (정수)
- 픽셀 변환: `pixel = grid_pos × 28`
- 보간 없음 (틱 기반 이동, 스무딩 없음)

#### 드로잉

`_draw()` 함수 또는 Sprite2D + 동적 텍스처 사용:
- 둥근 사각형: `draw_rect()` 또는 `StyleBoxFlat`
- 원형: `draw_circle()` 또는 `draw_arc()`
- 텍스트: `draw_string()` with monospace font
- 글로우: `CanvasItem` shadow/modulate 또는 `Light2D`

#### 입력

```gdscript
# 키보드
func _input(event: InputEvent) -> void:
    if event is InputEventKey:
        match event.keycode:
            KEY_UP, KEY_W: try_buffer(Direction.UP)
            KEY_RIGHT, KEY_D: try_buffer(Direction.RIGHT)
            # ...

# 터치/D-pad
func _on_touch(event: InputEventScreenTouch):
    # D-pad hit test
    # Joystick activation
```

#### 사운드

Godot `AudioStreamPlayer` + 미리 생성한 짧은 효과음 파일 사용.
또는 `AudioStreamGenerator`로 프로시저럴 생성:
```gdscript
# eat sound: sine 600→900Hz, 100ms
# merge sound: triangle 400→1200Hz, 200ms
# death sound: sawtooth 400→80Hz, 400ms
# pop sound: sine 800→400Hz, 80ms
# round_clear: 4-note fanfare C5 E5 G5 C6
```

### 15.4 폰트

- 기본 폰트: **Monospace** (예: JetBrains Mono, Source Code Pro, 또는 Godot 기본 monospace)
- 크기는 문서 내 px 값 그대로 사용 (28px 셀 기준)

### 15.5 모바일 대응

- 터치 입력은 D-pad + 조이스틱 모두 지원
- 진동: `Input.vibrate_handheld(ms)`
- 화면 비율 고정: 436:794

### 15.6 GameLoop 타이밍

```
SNAKE_TICK_MS     = 400   (기본 틱)
MERGE_GLOW_MS     = 150   (머지 글로우)
MERGE_SHRINK_MS   = 150   (머지 축소)
ROUND_CLEAR_POP_MS = 100  (팝 간격)
FOOD_SPAWN_INTERVAL = 2000 (음식 스폰 간격)
```

---

## 부록: 전체 상수 레퍼런스

```
# Grid
CELL_SIZE = 28
GRID_COLS = 14
GRID_ROWS = 23
HUD_ROWS = 3
PLAY_ROWS = 20
PLAY_Y_OFFSET = 3
GRID_WIDTH = 392
GRID_HEIGHT = 644
SIDE_PANEL_WIDTH = 44
CANVAS_WIDTH = 436
DPAD_AREA_HEIGHT = 150
CANVAS_HEIGHT = 794

# Timing
SNAKE_TICK_MS = 400
MERGE_GLOW_MS = 150
MERGE_SHRINK_MS = 150
MERGE_DELAY_MS = 300
ROUND_CLEAR_POP_MS = 100
FOOD_SPAWN_INTERVAL_MS = 2000

# Gameplay
DECAY_DISTANCE = 16  (미사용)
INITIAL_LIVES = 1    (미사용)
FOOD_COUNT_MAX = 18
FOOD_INITIAL_COUNT = 3
MAX_FOOD_VALUE = 3

# Scoring
MERGE_BASE_SCORE = 10
CHAIN_MULTIPLIER = 2

# Round
ROUND_1_TARGET_SCORE = 600
ROUND_SCORE_MULTIPLIER = 2.0
ROUND_SPEED_DECREASE = 30
MIN_TICK_MS = 150
ROUND_CLEAR_BONUS_BASE = 50

# Food Spawn Weights
FOOD_CHANCE_MEANINGFUL = 0.60
FOOD_CHANCE_EDIBLE = 0.25
FOOD_CHANCE_DANGEROUS = 0.10
FOOD_CHANCE_SPECIAL = 0.05
MERGE_ITEM_CHANCE = 0.10
```
