# eslint-plugin-no-misleading-return-type

반환 타입 주석이 TypeScript의 추론 타입보다 덜 정확한 경우를 감지합니다.

## 이 규칙이 필요한 이유

TypeScript는 실제로 코드로부터 추론한 타입보다 **더 넓은(덜 정확한) 반환 타입 주석**을 허용합니다. 이로 인해 조용한 정확도 손실이 발생합니다. 리터럴 타입, 정확한 유니온, 그리고 다른 좁은 추론들의 이점을 잃게 됩니다.

```ts
// TypeScript는 "idle"을 추론하지만, string을 받음
function getStatus(): string { return "idle"; }  // 오류 없음!

// 더 나음: TypeScript가 정확한 타입을 추론하도록 함
function getStatus() { return "idle"; }          // 타입: "idle"
```

이 규칙은 주석 타입이 추론 타입보다 넓은 경우를 감지하고 보고하여, 불필요한 주석을 제거하고 타입을 정확하게 유지하도록 도와줍니다.

## 설치

```bash
pnpm add -D eslint-plugin-no-misleading-return-type
```

필수 요구사항:
- ESLint >= 10.1
- TypeScript >= 5.0
- 타입 정보가 활성화된 `@typescript-eslint/parser`

## 설정

TypeScript 지원이 포함된 ESLint flat config에 플러그인을 추가합니다:

```ts
// eslint.config.ts
import * as noMisleadingReturnType from "eslint-plugin-no-misleading-return-type";
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

**중요:** 타입 정보가 필요합니다. 다음 중 하나를 사용하세요:
- `projectService: { allowDefaultProject: [...] }` (ESLint 9+, 권장)
- `project: "./tsconfig.json"` (기존 설정)

## 규칙: `no-misleading-return-type`

### 확인 대상

함수의 명시적 반환 타입 주석이 TypeScript의 추론 타입보다 **넓은** 경우를 보고합니다.

- **보고함:** 주석 타입이 추론 타입보다 넓음 (예: `string` vs `"idle"`)
- **보고 안 함:** 주석 타입이 추론 타입과 같거나 더 좁음
- **보고 안 함:** 주석 없음, void, any, unknown, never, 제너레이터, 제네릭, 게터/세터, 오버로드, 비동기 `Promise<void|any>`

### 유효한 경우 (경고 없음)

```ts
// 주석이 추론과 일치
function getStatus(): "idle" { return "idle"; }

// 주석 없음 — 자동으로 추론됨
function getStatus() { return "idle"; }

// 이스케이프 해치 (의도적으로 넓은 타입)
function run(): void { console.log("done"); }
function parse(): any { return JSON.parse(s); }

// 비동기 함수, 내부 타입 일치
async function greet(): Promise<"hello"> { return "hello"; }
```

### 유효하지 않은 경우 (경고 발생)

```ts
// 주석이 추론보다 넓음
function getStatus(): string { return "idle"; }  // string > "idle"
function getCode(): number { return 404; }       // number > 404
function isOn(): boolean { return true; }        // boolean > true

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

## 의도적으로 넓은 타입이 필요한 경우

일부 함수는 정당하게 넓은 반환 타입을 가집니다. `eslint-disable`을 사용하여 경고를 억제하세요:

```ts
// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function parse(input: string): any {
  return JSON.parse(input);  // 의도적으로 any 반환
}

// eslint-disable-next-line no-misleading-return-type/no-misleading-return-type
function fetch(): Promise<string> {
  return asyncOperation();   // 의도적으로 넓은 타입
}
```

## 라이센스

MIT — [LICENSE](./LICENSE) 참조
