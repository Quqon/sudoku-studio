# Runtime Structure

`client/src/App.tsx`는 하나의 전체 화면 `GameCanvas`만 렌더링한다. React는 Babylon 엔진의 시작·종료와 캔버스 크기만 관리하며, 게임 규칙과 화면 드로잉은 React 상태에 의존하지 않는다.

| 모듈 | 소유 책임 |
| --- | --- |
| `game/puzzle.ts` | 난이도별 단서 수, 해답 보존형 퍼즐 생성, 보드 타입 |
| `game/SudokuGame.ts` | 선택·메모·입력·되돌리기·힌트·충돌·타이머·완료 상태 |
| `game/InputManager.ts` | 키보드의 의미 기반 액션 변환 및 해제 |
| `game/GameWorld.ts` | Babylon 동적 텍스처에 그리는 에디토리얼 UI, 포인터 히트테스트, 자산 로드 |
| `game/scene.ts` | 직교 카메라와 화면 평면, 월드 생성 및 수명주기 |
| `components/GameCanvas.tsx` | Babylon 엔진 단일 초기화, 렌더 루프, 창 크기 정리 |

Babylon 씬은 직교 카메라와 한 장의 전체 화면 평면으로 구성된다. `GameWorld`는 동적 텍스처를 해당 평면에 그리며, 생성된 종이·모티프·마크·레퍼런스 자산을 캔버스 UI 안에서 직접 사용한다. 포인터 좌표는 렌더 텍스처 좌표로 환산되어 보드와 도구 버튼의 의미 액션으로 바뀐다.
