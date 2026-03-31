# eslint-plugin-no-misleading-return-type

구현이 실제로 반환하는 것보다 오도할 수 있을 만큼 넓은 반환 타입 어노테이션을 감지합니다.

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

이 규칙은 주석 타입이 추론 타입보다 넓은 경우를 감지하고 보고하여, 오해를 유발하는 넓은 반환 타입 주석을 감지하고, 구현이 제공하는 정확성을 보존하도록 도와줍니다.

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
- Node.js `^18.18.0 || ^20.9.0 || >=21.1.0`
- ESLint `^9.0.0 || ^10.0.0`
- TypeScript `>=5.0.0 <7.0.0` (tested: 5.0–6.x)
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
- `projectService: { allowDefaultProject: [...] }` (권장 파서 설정)
- `project: "./tsconfig.json"` (기존 tsconfig 기반 설정)

> `TypeError: Cannot read properties of undefined (reading 'program')` 오류가 발생하면
> 타입 정보가 설정되지 않은 것입니다. `parserOptions`를 확인하세요.

## 설정 프리셋

수동 규칙 설정 대신 내장 프리셋 중 하나를 사용할 수 있습니다.
**참고:** `@typescript-eslint/parser`와 타입 정보가 포함된 `languageOptions`는 여전히 직접 설정해야 합니다.

```ts
// eslint.config.ts
import noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser,
      parserOptions: { projectService: { allowDefaultProject: ["*.ts", "*.tsx"] } },
    },
    ...noMisleadingReturnType.configs.recommended, // warn + suggestion (기본값)
    // ...noMisleadingReturnType.configs.strict,    // error + suggestion
    // ...noMisleadingReturnType.configs.autofix,   // warn + autofix
  },
];
```

| 프리셋 | 심각도 | 수정 모드 |
|--------|--------|-----------|
| `recommended` | `warn` | `suggestion` |
| `strict` | `error` | `suggestion` |
| `autofix` | `warn` | `autofix` |

> **팁:** 프리셋 spread를 커스텀 설정 _앞에_ 배치하여 `languageOptions`가 우선 적용되도록 하세요:
> ```ts
> {
>   ...noMisleadingReturnType.configs.recommended,
>   files: ["**/*.ts", "**/*.tsx"],
>   languageOptions: { parser, parserOptions: { ... } },
> }
> ```

## 규칙: `no-misleading-return-type`

### 확인 대상

함수의 명시적 반환 타입 주석이 TypeScript의 추론 타입보다 **넓은** 경우를 보고합니다.

- **보고함:** 주석 타입이 추론 타입보다 넓음 (예: `Record<string, string>` vs `{ readonly INVALID_TOKEN: "..." }`)
- **보고 안 함:** 주석 타입이 추론 타입과 같거나 더 좁음
- **보고 안 함:** 주석 없음, `void`, `any`, `unknown`, `never`, 제너레이터, 복잡한 타입 구조의 제네릭 (conditional/mapped/index 타입), 게터+세터 쌍, 오버로드, 비동기 `Promise<void|any>`

### 유효한 경우 (경고 없음)

```ts
// 주석 없음 — TypeScript가 정확한 타입을 추론
function getErrorMessages() {
  return {
    INVALID_TOKEN: 'Please log in again.',
    NETWORK_ERROR: 'Check your network connection.',
  } as const;
}

// 단일 리터럴 반환 — 이 룰이 TS 반환 타입 추론을 근사하여 넓힘
function getStatus(): string { return "idle"; }
function getCode(): number { return 404; }

// 주석이 추론과 일치
function getStatus(): "idle" { return "idle"; }

// 이스케이프 해치 (의도적으로 넓은 타입)
function run(): void { console.log("done"); }
function parse(s: string): any { return JSON.parse(s); }

// 비동기 함수, 내부 타입 일치
async function greet(): Promise<"hello"> { return "hello"; }
async function greet(): Promise<string> { return "hello"; }  // 단일 반환 — string으로 넓힘
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

// 여러 반환값, 유니온 확대
function getStatus(loading: boolean): string {
  if (loading) return "loading";
  return "idle";                                 // 추론: "loading" | "idle", 주석: string
}

// 비동기 여러 반환값
async function getStatus(x: boolean): Promise<string> {
  if (x) return "a";
  return "b";                                    // 추론: Promise<"a" | "b">, 주석: Promise<string>
}
```

### 옵션

| 옵션 | 타입 | 기본값 | 효과 |
|------|------|--------|------|
| `fix` | `"suggestion" \| "autofix" \| "none"` | `"suggestion"` | 수정 제공 방식 |

**fix 모드:**
- `"suggestion"` — IDE 인라인 제안: (1) 주석 제거, (2) 추론 타입으로 주석 좁히기
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

## 이 룰의 추론 방식

이 룰은 TypeScript의 타입 체커 API를 사용하여 추론된 반환 타입을 근사합니다. TypeScript 추론 엔진의 완전한 재구현이 **아닙니다**.

- **단일 반환:** `getBaseTypeOfLiteralType`으로 넓힘 (TS 시그니처 추론과 일치)
- **다중 반환:** 반환 표현식들의 리터럴 유니온 (TS 유니온 추론과 일치)
- **비동기 함수:** `Promise<T>`, `PromiseLike<T>`, 그리고 이를 확장하는 타입 (예: `interface ApiResponse<T> extends Promise<T>`) 언래핑 후 내부 타입 비교
- **제네릭 함수:** 구체적 주석 (예: `: object`, `: string`)과 단순 타입 파라미터 사용 (예: `: T | null`, `: { value: T }`)을 검사. 복잡한 타입 구조 (conditional, mapped, index, indexed access 타입)만 건너뜀

이 접근 방식은 실제 사용 사례의 대부분을 커버합니다. 알려진 제한 사항은 [검사하지 않는 케이스](#검사하지-않는-케이스)를 참조하세요.

## 검사하지 않는 케이스

### 일반적인 케이스

일상적인 코드에서 자주 마주칠 수 있는 케이스:

| 케이스 | 이유 |
|--------|------|
| 단일 리터럴 반환값 | 이 룰이 기본 타입으로 넓힘 (예: `"idle"` → `string`) — TypeScript의 반환 타입 추론을 근사 |
| 복잡한 타입 구조의 제네릭 함수 | 반환 타입이 conditional (`T extends X ? Y : Z`), mapped (`{ [K in keyof T]: V }`), index (`keyof T`), indexed access (`T[K]`) 타입을 사용하면 추론이 지연되어 비교 불가. 단순 타입 파라미터 사용 (`: T`, `: T[]`, `: T \| null`)의 제네릭 함수는 **검사됨** — 예: `T \| null`에서 null을 반환하지 않는 경우 감지 |
| 제너레이터 함수 | 복잡한 이터레이터 타입 |
| `as const` 없는 객체 리터럴 (필수 string 프로퍼티) | 어노테이션의 컨텍스트 타입이 추론 전에 리터럴을 넓힘 — `as const` 객체는 우회하여 보고됨 |
| 어노테이션에 `undefined` 또는 `void`가 포함되지만 추론 타입에는 없는 경우 | 암시적 undefined 반환 경로 휴리스틱 — 명시적 `return` 없는 코드 경로를 추적할 수 없음 |

### 엣지 케이스

전문적인 처리가 필요한 드문 시나리오:

| 케이스 | 이유 |
|--------|------|
| `void`, `any`, `unknown`, `never` | 의도적인 이스케이프 해치 |
| `Promise<void>` / `Promise<any>` | 의도적인 이스케이프 해치 |
| 게터+세터 쌍 | 게터 반환 타입이 세터 파라미터 타입과 일치해야 함 |
| `return` 문이 없는 함수 | void 함수 — 비교 대상 없음 |
| 재귀 함수 및 타입 체커 예외 | 타입 해석 실패 시 (순환 타입, 체커 오류 등) lint 실행 중단 대신 해당 함수를 건너뜀 |
| enum 리터럴 반환 | 단일 enum 멤버 반환은 enum 타입으로 넓혀짐 (예: `Status.Idle` → `Status`), TypeScript 추론과 일치. 다중 멤버 반환은 달라질 수 있음 |
| 커스텀 thenable | `Promise<T>`, `PromiseLike<T>`, 그리고 이를 확장하는 타입은 언래핑됨. `then` 메서드를 가진 다른 thenable은 미지원 |
| 오버로드 구현 함수 | 모든 오버로드 시그니처를 커버하기 위해 의도적으로 넓음 |
| `override` 메서드 | 부모 클래스 반환 타입과 일치해야 함. 좁힐 수 있는 override를 놓칠 수 있음 (트레이드오프) |
| `declare` 함수 / 추상 메서드 | 분석할 본문 없음 |

### 판별 유니온과 컨텍스트 타입

React/Redux 코드베이스에서 흔한 판별 유니온 반환 패턴:

```ts
type Action = { type: string; payload: unknown };

function createAction(): Action {
  return { type: "INCREMENT", payload: 42 };
}
```

`as const` 없이는 TypeScript의 **컨텍스트 타입**이 프로퍼티 값을 넓히므로 (`"INCREMENT"` → `string`), 이 룰이 감지할 수 없습니다. 판별자의 정확성을 보존하려면 `as const`를 사용하세요:

```ts
function createAction() {
  return { type: "INCREMENT", payload: 42 } as const;
}
// 추론: { readonly type: "INCREMENT"; readonly payload: 42 }
```

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

## 문제 해결

**규칙이 아무것도 보고하지 않는 경우**
- 타입 정보가 설정되어 있는지 확인하세요 (`parserOptions`에 `projectService` 또는 `project` 설정)
- 파일이 TypeScript 프로젝트에 포함되어 있는지 확인하세요
- 반환 타입 어노테이션이 없는 함수는 의도적으로 건너뜁니다

**규칙이 너무 많이 보고하는 경우**
- 단일 리터럴 반환 (예: `return "idle"`)은 TS 추론을 근사하기 위해 넓혀짐 — 이는 의도된 동작입니다
- `as const` 없는 객체 리터럴 프로퍼티는 컨텍스트 타입으로 처리될 수 있습니다 — 정확한 타입을 원하면 `as const`를 사용하세요
- 의도적으로 넓은 반환 타입 (예: 안정적인 API 계약)에는 `eslint-disable`을 사용하세요

## 라이센스

MIT — [LICENSE](./LICENSE) 참조
