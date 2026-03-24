# Release Plan

## 0. 결정 사항 (먼저 확인)

- [ ] **버전**: `0.1.0` vs `1.0.0`
  - `0.1.0` 권장 — getter/setter/generator/class-method 미지원, 아직 MVP
  - `1.0.0`은 stable API를 의미하므로 제약 사항이 명확히 문서화된 경우에만 사용
- [ ] **GitHub repo 이름**: `eslint-plugin-no-misleading-return-type` (패키지명과 동일하게)
- [ ] **npm 배포 범위**: unscoped (`eslint-plugin-no-misleading-return-type`) — 현재 package.json 그대로
- [ ] **npm 계정**: `minseong0324` 계정으로 배포 예정인지 확인

---

## 1. .gitignore 수정

- [ ] `pnpm-lock.yaml`을 `.gitignore`에서 제거
  - 이유: lockfile은 재현 가능한 빌드를 위해 반드시 커밋해야 함
  - `pnpm-lock.yaml`이 없으면 CI에서 `--frozen-lockfile`이 실패

---

## 2. Git 초기화 및 atomic 커밋

### 커밋 순서 (각 커밋은 독립적으로 리버트 가능해야 함)

- [ ] **commit 1 — chore: init project structure**
  ```
  package.json, tsconfig.json, .gitignore, .npmrc, .nvmrc,
  LICENSE, biome.json, knip.json, tsdown.config.ts
  ```

- [ ] **commit 2 — feat: implement no-misleading-return-type rule**
  ```
  src/index.ts
  src/rules/no-misleading-return-type.ts
  src/helpers/includes-undefined.ts
  src/helpers/is-escape-hatch.ts
  src/helpers/is-function-like.ts
  src/helpers/truncate-type-string.ts
  ```

- [ ] **commit 3 — test: add unit tests**
  ```
  __tests__/unit/
  ```

- [ ] **commit 4 — test: add integration tests**
  ```
  __tests__/integration/
  ```

- [ ] **commit 5 — docs: add README, CONTRIBUTING, PR template**
  ```
  README.md, README.ko.md, CONTRIBUTING.md,
  .github/pull_request_template.md, .github/CODEOWNERS
  ```

- [ ] **commit 6 — ci: add GitHub Actions workflows**
  ```
  .github/workflows/ci.yml
  .github/workflows/release.yml
  .github/workflows/autofix.yml
  .github/renovate.json
  ```

- [ ] **commit 7 — chore: init changesets**
  ```
  .changeset/config.json, .changeset/README.md
  ```

---

## 3. GitHub 저장소 생성

- [ ] GitHub에서 repo 생성
  ```
  이름: eslint-plugin-no-misleading-return-type
  설명: ESLint rule to detect return type annotations wider than TypeScript's inferred type
  Public / MIT
  README 없이 생성 (이미 있음)
  ```
- [ ] remote 추가
  ```bash
  git remote add origin https://github.com/minseong0324/eslint-plugin-no-misleading-return-type.git
  ```
- [ ] main 브랜치로 첫 push
  ```bash
  git push -u origin main
  ```
- [ ] GitHub 저장소 설정
  - [ ] Topics 추가: `eslint`, `eslint-plugin`, `typescript`, `static-analysis`
  - [ ] `NPM_TOKEN` secret 등록 (release workflow가 필요)
  - [ ] branch protection rule: main — require PR, require CI pass

---

## 4. npm 배포 준비

- [ ] npm 로그인 확인
  ```bash
  npm whoami   # minseong0324 인지 확인
  ```
- [ ] 패키지명 선점 확인
  ```bash
  npm view eslint-plugin-no-misleading-return-type 2>&1
  # 404면 사용 가능
  ```
- [ ] 배포 방식 결정
  - **방법 A (수동 첫 배포)**: `pnpm publish --access public` → 이후 changesets로 관리
  - **방법 B (changesets로 첫 배포)**: changeset 추가 → PR merge → release workflow 자동 배포
  - 권장: **방법 A** — 첫 배포는 수동으로, 이후 CI 자동화

### 수동 첫 배포 절차
- [ ] changeset 없이 버전만 확인 (`package.json`의 `version` 필드)
- [ ] 빌드 확인
  ```bash
  pnpm build && pnpm publint
  ```
- [ ] dry-run 확인
  ```bash
  pnpm publish --dry-run --access public
  ```
- [ ] 실제 배포
  ```bash
  pnpm publish --access public
  ```
- [ ] npm 페이지 확인: `https://www.npmjs.com/package/eslint-plugin-no-misleading-return-type`

---

## 5. 첫 배포 후 — changesets 워크플로우 설정

- [ ] `NPM_TOKEN`을 GitHub Secrets에 등록
  - npm → Access Tokens → Generate New Token (Automation)
  - GitHub repo → Settings → Secrets → `NPM_TOKEN`
- [ ] release workflow 동작 검증: changeset 추가 → PR merge → 자동 버전 PR 생성 → merge → npm 배포

---

## 6. 누락 가능한 추가 작업

- [ ] **`docs/rules/no-misleading-return-type.md`** 생성
  - rule 문서 URL이 코드에 하드코딩되어 있음:
    `https://github.com/minseong0324/eslint-plugin-no-misleading-return-type/blob/main/docs/rules/no-misleading-return-type.md`
  - 파일이 없으면 링크가 404
- [ ] **버전 태그**: 첫 배포 후 `git tag v0.1.0 && git push --tags`
- [ ] **GitHub Release 노트** 작성 (changeset이 자동 생성하지만 첫 배포는 수동)
- [ ] **`pnpm-lock.yaml` 커밋 여부** 재확인 (`.gitignore`에서 제거 후)

---

## PR / 브랜치 전략 (향후)

첫 배포는 main 직접 push. 이후 기능 추가 시:

```
브랜치명: feat/support-generators, fix/class-method-edge-case 등
PR Title 포맷: feat: support generator functions | fix: skip class getter/setter
PR Body: .github/pull_request_template.md 양식 사용
```

---

## 남은 기술 부채 (배포 후 이슈로 등록 권장)

| 항목 | 우선순위 |
|------|----------|
| generator function 지원 | Medium |
| getter/setter 지원 | Low |
| class method (abstract 포함) 지원 | Medium |
| `export { foo }` 패턴 외 re-export 케이스 | Low |
| ESLint 8 호환성 검토 | Low |
