# Simulation Agent
import math, random, logging
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class SimResult:
    n_paths: int; years: float; initial_value: float
    median_terminal: float=0.0; p10_terminal: float=0.0; p90_terminal: float=0.0
    rational_median: float=0.0; panic_rate_pct: float=0.0
    median_behaviour_cost: float=0.0
    sample_paths: list=field(default_factory=list)
    panic_events: list=field(default_factory=list)
    behaviour_summary: str=""
    percentile_series: dict=field(default_factory=dict)

class SimulationAgent:
    def run(self, portfolio, behaviour_profile=None, years=5.0, n_paths=200):
        from agents.behaviour_agent import BehaviourProfile
        if behaviour_profile is None:
            behaviour_profile = BehaviourProfile(loss_aversion=2.0,panic_threshold_pct=-30.0,patience_score=9.0)
        n_steps=int(years*12); dt=1/12
        params=self._port_params(portfolio)
        mu=params["exp_ret"]; sigma=params["vol"]; S0=params["value"]
        t_rat,t_beh,b_costs,panic_events,sample_paths=[],[],[],[],[]
        n_years=int(years)
        annual_idxs=[min(i*12,n_steps) for i in range(n_years+1)]
        rat_snaps=[[] for _ in range(n_years+1)]
        beh_snaps=[[] for _ in range(n_years+1)]
        for pid in range(n_paths):
            raw=self._gbm(S0,mu,sigma,dt,n_steps)
            beh,panicked,p_step,p_dd,reentry=self._overlay(raw,behaviour_profile,dt)
            tr=raw[-1]; tb=beh[-1]
            t_rat.append(tr); t_beh.append(tb); b_costs.append(tr-tb)
            for i,idx in enumerate(annual_idxs):
                rat_snaps[i].append(raw[idx]); beh_snaps[i].append(beh[idx])
            if panicked and len(panic_events)<6:
                panic_events.append({"year":round(p_step/12,1),"drawdown_pct":round(p_dd*100,1),
                    "value":round(beh[p_step]),"cost":round(tr-tb),
                    "reentry_year":round(reentry/12,1) if reentry else None})
            if len(sample_paths)<40:
                stride=max(1,n_steps//60)
                sample_paths.append({"panicked":panicked,
                    "values":[round(v) for v in beh[::stride]],
                    "rational":[round(v) for v in raw[::stride]]})
        def _pct(arr,p):
            s=sorted(arr); return round(s[min(int(len(s)*p//100),len(s)-1)])
        percentile_series={
            "years":list(range(n_years+1)),
            "rational":{"p10":[_pct(rat_snaps[i],10) for i in range(n_years+1)],
                        "p25":[_pct(rat_snaps[i],25) for i in range(n_years+1)],
                        "p50":[_pct(rat_snaps[i],50) for i in range(n_years+1)],
                        "p75":[_pct(rat_snaps[i],75) for i in range(n_years+1)],
                        "p90":[_pct(rat_snaps[i],90) for i in range(n_years+1)]},
            "behavioural":{"p10":[_pct(beh_snaps[i],10) for i in range(n_years+1)],
                           "p25":[_pct(beh_snaps[i],25) for i in range(n_years+1)],
                           "p50":[_pct(beh_snaps[i],50) for i in range(n_years+1)],
                           "p75":[_pct(beh_snaps[i],75) for i in range(n_years+1)],
                           "p90":[_pct(beh_snaps[i],90) for i in range(n_years+1)]},
        }
        t_rat.sort(); t_beh.sort(); b_costs.sort(); n=len(t_beh)
        bp=behaviour_profile
        return SimResult(n_paths=n_paths,years=years,initial_value=S0,
            median_terminal=round(t_beh[n//2]),p10_terminal=round(t_beh[max(0,n//10)]),
            p90_terminal=round(t_beh[min(n-1,n*9//10)]),rational_median=round(t_rat[n//2]),
            panic_rate_pct=round(sum(1 for p in sample_paths if p["panicked"])/max(1,len(sample_paths))*100,1),
            median_behaviour_cost=round(b_costs[n//2]),sample_paths=sample_paths,
            panic_events=panic_events,
            behaviour_summary=f"{bp.risk_label.title()} | panic@{bp.panic_threshold_pct}% | LA={bp.loss_aversion:.1f}x | patience={bp.patience_score:.1f}/10",
            percentile_series=percentile_series)

    def compare_clients(self, portfolio, profile_a, profile_b, years=10.0, n_paths=300):
        ra=self.run(portfolio,profile_a,years=years,n_paths=n_paths)
        rb=self.run(portfolio,profile_b,years=years,n_paths=n_paths)
        diff=abs(ra.median_terminal-rb.median_terminal)
        pct=diff/max(1,ra.rational_median)*100
        return {"portfolio_value":ra.initial_value,"years":years,"rational_baseline":ra.rational_median,
            "client_a":{"label":profile_a.risk_label,"summary":profile_a.raw_summary,
                "panic_rate_pct":ra.panic_rate_pct,"median_wealth":ra.median_terminal,
                "p10_wealth":ra.p10_terminal,"p90_wealth":ra.p90_terminal,
                "behaviour_cost":ra.median_behaviour_cost,"sample_paths":ra.sample_paths[:20],"panic_events":ra.panic_events},
            "client_b":{"label":profile_b.risk_label,"summary":profile_b.raw_summary,
                "panic_rate_pct":rb.panic_rate_pct,"median_wealth":rb.median_terminal,
                "p10_wealth":rb.p10_terminal,"p90_wealth":rb.p90_terminal,
                "behaviour_cost":rb.median_behaviour_cost,"sample_paths":rb.sample_paths[:20],"panic_events":rb.panic_events},
            "wealth_gap":round(diff),"wealth_gap_pct":round(pct,1),
            "insight":(f"Same Rs.{ra.initial_value:,.0f} portfolio over {years:.0f}yr. "
                f"Client A: Rs.{ra.median_terminal:,.0f} (panic {ra.panic_rate_pct}%). "
                f"Client B: Rs.{rb.median_terminal:,.0f} (panic {rb.panic_rate_pct}%). "
                f"Gap: Rs.{diff:,.0f} ({pct:.1f}% of rational outcome).")}

    def _port_params(self, portfolio):
        try:
            from utils.asset_model import get_prior,get_correlation
            all_assets=portfolio.get("schemes",[])+portfolio.get("assets",[])
            total=sum(s.get("current_value",0) for s in all_assets)
            if total==0: raise ValueError
            weights=[s.get("current_value",0)/total for s in all_assets]
            sts=[s.get("sub_type","MF:LargeCap") for s in all_assets]
            priors=[get_prior(st) for st in sts]
            exp_ret=sum(w*p["exp_ret"] for w,p in zip(weights,priors))
            var=sum(weights[i]*weights[j]*priors[i]["vol"]*priors[j]["vol"]*
                (1.0 if i==j else get_correlation(priors[i]["group"],priors[j]["group"]))
                for i in range(len(all_assets)) for j in range(len(all_assets)))
            return {"value":total,"exp_ret":exp_ret,"vol":math.sqrt(max(0,var))}
        except (ImportError, KeyError, ValueError, AttributeError, ZeroDivisionError) as e:
            logging.warning("SimulationAgent._port_params failed (%s: %s); using portfolio-reported defaults.", type(e).__name__, e)
            val=portfolio.get("reported",{}).get("current_value",5985982)
            return {"value":val,"exp_ret":0.12,"vol":0.14}

    def _gbm(self,S0,mu,sigma,dt,n_steps):
        path=[S0]; S=S0
        drift=(mu-0.5*sigma**2)*dt; vol=sigma*math.sqrt(dt)
        for _ in range(n_steps):
            z=(random.gauss(0,1)+random.gauss(0,1)+random.gauss(0,1))/math.sqrt(3)
            S=S*math.exp(drift+vol*z); path.append(S)
        return path

    def _overlay(self,raw,bp,dt):
        path=list(raw); threshold=bp.panic_threshold_pct/100
        reentry_m=max(2,int(12-bp.patience_score))
        in_cash=False; cash_val=0; cash_from=0
        panicked=False; panic_step=None; panic_dd=None; reentry=None; peak=raw[0]
        for i in range(1,len(path)):
            peak=max(peak,raw[i-1]); dd=(raw[i]-peak)/peak
            if not in_cash and dd<=threshold:
                in_cash=True; panicked=True; panic_step=i; panic_dd=dd
                cash_val=path[i]; cash_from=i
            if in_cash:
                elapsed=i-cash_from
                path[i]=cash_val*((1+0.065*dt)**elapsed)
                recovery=(raw[i]-raw[panic_step])/max(1,abs(raw[panic_step]))
                if elapsed>=reentry_m and recovery>=0.08:
                    frac=max(0.5,1-max(0,bp.loss_aversion-5)*0.08)
                    path[i]=cash_val*frac+raw[i]*(1-frac)
                    cash_val=path[i]; in_cash=False; reentry=i
        return path,panicked,panic_step,panic_dd,reentry
