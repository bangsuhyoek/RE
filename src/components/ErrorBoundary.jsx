import { Component } from "react";

// 화면을 그리다 예외가 나면 흰 화면 대신 복구 화면을 보여준다. 다시 시도·홈으로 모두 앱을 새로 불러온다
// (지연 로딩 묶음을 못 받은 경우에도 새로 받아오게 하려는 것). 구독 데이터는 기기 저장소에 남아 있다.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("화면 렌더링 오류", error, info?.componentStack);
  }

  handleRetry = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = "#/home";
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="app-shell grid min-h-screen place-items-center px-6" role="alert">
        <div className="w-full max-w-[360px] text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#F4F7F5] text-[26px]" aria-hidden="true">
            !
          </div>
          <h1 className="mt-4 text-[19px] font-extrabold tracking-tight text-[#111315]">화면을 불러오지 못했어요</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#6B7684]">
            일시적인 문제일 수 있어요. 등록한 구독 정보는 그대로 남아 있어요.
          </p>
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="min-h-[48px] rounded-2xl bg-[#153D2E] px-5 text-[15px] font-bold text-white active:scale-[0.99]"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={this.handleGoHome}
              className="min-h-[48px] rounded-2xl border border-[#DDE2DF] bg-white px-5 text-[15px] font-bold text-[#252A28]"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }
}
