# eslint-plugin-no-misleading-return-type

반환 타입 주석이 TypeScript의 추론 타입보다 덜 정확한 경우를 감지합니다.

## 이 규칙이 필요한 이유

TypeScript는 실제 구현보다 **더 넓은(덜 정확한) 반환 타입 주석**을 허용합니다. 이로 인해 의도적으로 만든 정확성이 조용히 사라집니다.

```ts
// 구현은 정확한 에러 메시지 맵을 반환하지만,
// 명시적 반환 타입이 Record<string, string>으로 넓혀집니다.
function getErrorMessages(): Record<string, string> {
  return {
    INVALID_TOKEN: 'Please log in again.',
    RATE_LIMITED: 'Too many requests. Try again later.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// 더 나음: TypeScript가 정확한 타입을 추론하도록 합니다.
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    RATE_LIMITED: 'Too many requests. Try again later.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}
```

이 규칙은 주석 타입이 추론 타입보다 넓은 경우를 감지하고 보고하여, 불필요한 주석을 제거하고 구현이 제공하는 정확성을 보존하도록 도와줍니다.

## 설치

```bash
# npm
npm install -D eslint-plugin-no-misleading-return-type
# yarn
yarn add -D eslint-plugin-no-misleading-return-type
# pnpm
pnpm add -D eslint-plugin-no-misleading-return-type
```

**필수 요구사항:**
- Node.js >= 22.12.0
- ESLint `^9.0.0 || ^10.0.0`
- TypeScript `>=5.0.0 <6.0.0` (tested: 5.0–5.9)
- 타입 정보가 활성화된 `@typescript-eslint/parser`

## 설정

TypeScript 지원이 포함된 ESLint flat config에 플러그인을 추가합니다:

```ts
// eslint.config.ts
import noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
// 또는: import * as noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.ts", "*.tsx"],
        },
      },
    },
    plugins: {
      "no-misleading-return-type": noMisleadingReturnType,
    },
    rules: {
      "no-misleading-return-type/no-misleading-return-type": "warn",
    },
  },
];
```

**타입 정보가 필요합니다.** 다음 중 하나를 사용하세요:
- `projectService: { allowDefaultProject: [...] }` (ESLint 9+, 권장)
- `project: "./tsconfig.json"` (기존 설정)

> `TypeError: Cannot read properties of undefined (reading 'program')` 오류가 발생하면
> 타입 정보가 설정되지 않은 것입니다. `parserOptions`를 확인하세요.

## 규칙: `no-misleading-return-type`

### 확인 대상

함수의 명시적 반환 타입 주석이 TypeScript의 추론 타입보다 **넓은** 경우를 보고합니다.

- **보고함:** 주석 타입이 추론 타입보다 넓음 (예: `Record<string, string>` vs `{ readonly INVALID_TOKEN: "..." }`)
- **보고 안 함:** 주석 타입이 추론 타입과 같거나 더 좁음
- **보고 안 함:** 주석 없음, `void`, `any`, `unknown`, `never`, 제너레이터, 제네릭, 게터/세터, 오버로드, 비동기 `Promise<void|any>`

### 유효한 경우 (경고 없음)

```ts
// 주석 없음 — TypeScript가 정확한 타입을 추론
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// 주석이 추론과 일치
function getStatus(): "idle" { return "idle"; }

// 이스케이프 해치 (의도적으로 넓은 타입)
function run(): void { console.log("done"); }
function parse(s: string): any { return JSON.parse(s); }

// 비동기 함수, 내부 타입 일치
async function greet(): Promise<"hello"> { return "hello"; }
```

### 유효하지 않은 경우 (경고 발생)

```ts
// as const 맵이 명시적 주석으로 인해 넓어짐
function getErrorMessages(): Record<string, string> {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// 리터럴 타입이 넓어짐
function getStatus(): string { return "idle"; }  // string > "idle"
function getCode(): number { return 404; }       // number > 404

// 비동기 함수, 넓은 Promise 내부 타입
async function greet(): Promise<string> { return "hello"; }  // Promise<string> > Promise<"hello">

// 여러 반환값, 유니온 확대
function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";                                 // 추론: "loading" | "idle", 주석: string
}
```

### 옵션

| 옵션 | 타입 | 기본값 | 효과 |
|------|------|--------|------|
| `fix` | `"suggestion" \| "autofix" \| "none"` | `"suggestion"` | 수정 제공 방식 |

**fix 모드:**
- `"suggestion"` — IDE 인라인 제안으로 주석 제거 (내보낸 함수에 안전)
- `"autofix"` — 주석 자동 제거 (`isolatedDeclarations`가 있는 내보낸 함수는 제안으로 폴백)
- `"none"` — 수정 없이 보고만 함

**예제:**

```ts
// eslint.config.ts
{
  rules: {
    "no-misleading-return-type/no-misleading-return-type": [
      "warn",
      { fix: "autofix" }
    ],
  },
}
```

## 검사하지 않는 케이스

| 케이스 | 이유 |
|--------|------|
| 제네릭 함수 | 추론이 호출 지점에 의존 |
| 제너레이터 함수 | 복잡한 이터레이터 타입 |
| 게터 / 세터 | 접근자 의미론이 다름 |
| `void`, `any`, `unknown`, `never` | 의도적인 이스케이프 해치 |
| `Promise<void>` / `Promise<any>` | 의도적인 이스케이프 해치 |
| `return` 문이 없는 함수 | void 함수 — 비교 대상 없음 |
| 재귀 함수 | 순환 타입 해석 |
| 필수 string 프로퍼티가 있는 객체 리터럴 | TypeScript 컨텍스트 타입이 추론 전에 리터럴을 넓힘 |

## 의도적으로 넓은 타입이 필요한 경우

일부 함수는 정당하게 넓은 반환 타입을 가집니다. `eslint-disable`을 사용하여 경고를 억제하세요:

```ts
// 추론: "loading" | "idle" — 안정적인 공개 API 계약을 위해 의도적으로 string 사용
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function getStatus(loading: boolean): string {
  if (loading) return 'loading';
  return 'idle';
}
```

## 라이센스

MIT — [LICENSE](./LICENSE) 참조
