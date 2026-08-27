import{describe,it,expect}from"vitest";
import{validateJarInput,validateDepositInput,createJar,createDeposit,normalizeJar,normalizeDeposit,getJarStatus,getProgressPercent,formatCurrency,formatDate,type Jar}from"../src/domain";
describe("validateJarInput",()=>{
  it.each(["","   ","a".repeat(51)])("rejects name %j",name=>{
    const r=validateJarInput({name,emoji:"",targetAmount:"100"});
    expect(r.ok).toBe(false);expect(r.errors.name).toBeTruthy();
  });
  it("accepts 50-char name",()=>expect(validateJarInput({name:"a".repeat(50),emoji:"",targetAmount:"100"}).errors.name).toBeUndefined());
  it.each(["","  ","0","-50","abc","NaN","Infinity"])("rejects target %j",targetAmount=>{
    const r=validateJarInput({name:"V",emoji:"",targetAmount});
    expect(r.ok).toBe(false);expect(r.errors.targetAmount).toBeTruthy();
  });
  it("accepts valid",()=>{
    const r=validateJarInput({name:"V",emoji:"🏖️",targetAmount:"500"});
    expect(r.ok).toBe(true);expect(r.errors).toEqual({});
  });
  it("reports multiple errors",()=>expect(Object.keys(validateJarInput({name:"",emoji:"",targetAmount:""}).errors).length).toBe(2));
});
describe("validateDepositInput",()=>{
  it.each(["","  ","0","-10","abc"])("rejects amount %j",amount=>{
    const r=validateDepositInput({amount,note:""});
    expect(r.ok).toBe(false);expect(r.errors.amount).toBeTruthy();
  });
  it("rejects note >200",()=>expect(validateDepositInput({amount:"50",note:"x".repeat(201)}).ok).toBe(false));
  it("accepts note 200",()=>expect(validateDepositInput({amount:"50",note:"x".repeat(200)}).errors.note).toBeUndefined());
  it("accepts valid/decimals",()=>{
    expect(validateDepositInput({amount:"25.50",note:""}).ok).toBe(true);
    expect(validateDepositInput({amount:"0.01",note:""}).ok).toBe(true);
  });
});
describe("createJar",()=>{
  it("creates jar",()=>{
    expect(createJar({name:" Laptop ",emoji:"💻",targetAmount:"1000"},"id-1","2024-01-01")).toEqual({id:"id-1",name:"Laptop",emoji:"💻",targetAmount:1000,savedAmount:0,deposits:[],createdAt:"2024-01-01"});
  });
  it("defaults emoji",()=>expect(createJar({name:"F",emoji:"",targetAmount:"200"},"id-2","2024-01-01").emoji).toBe("🫙"));
});
describe("createDeposit",()=>{
  it("creates deposit",()=>{
    expect(createDeposit({amount:"100",note:" bonus ",date:""},"d-1","2024-01-01")).toEqual({id:"d-1",amount:100,note:"bonus",date:"2024-01-01"});
  });
});
describe("normalizeJar",()=>{
  const valid={id:"j1",name:"Vacation",emoji:"🏖️",targetAmount:500,savedAmount:100,deposits:[],createdAt:"2024-01-01"};
  it("accepts valid",()=>expect(normalizeJar(valid)).not.toBeNull());
  it.each([null,"str",42,{...valid,id:1},{...valid,name:""},{...valid,name:" "},{...valid,targetAmount:"500"},{...valid,targetAmount:0},{...valid,targetAmount:-1},{...valid,savedAmount:-5},{...valid,deposits:"bad"}])("rejects corrupt %j",b=>expect(normalizeJar(b)).toBeNull());
  it("drops corrupt deposits",()=>{
    expect(normalizeJar({...valid,deposits:[{id:"x",amount:50,note:"ok",date:"2024-01-01"},null,"bad"]})?.deposits.length).toBe(1);
  });
  it("defaults empty emoji",()=>expect(normalizeJar({...valid,emoji:""})?.emoji).toBe("🫙"));
  it("does not mutate",()=>{
    const copy={...valid};normalizeJar(copy);expect(copy).toEqual(valid);
  });
});
describe("normalizeDeposit",()=>{
  const valid={id:"d1",amount:50,note:"test",date:"2024-01-01"};
  it("accepts valid",()=>expect(normalizeDeposit(valid)).not.toBeNull());
  it.each([null,42,{...valid,amount:0},{...valid,amount:-5},{...valid,amount:Infinity},{...valid,note:1}])("rejects invalid %j",b=>expect(normalizeDeposit(b)).toBeNull());
});
describe("getJarStatus",()=>{
  const base:Jar={id:"j1",name:"T",emoji:"🫙",targetAmount:100,savedAmount:0,deposits:[],createdAt:"2024-01-01"};
  it.each([[0,"not-started"],[50,"in-progress"],[1,"in-progress"],[100,"reached"],[150,"reached"]] as const)("saved %i gives %s",(saved,status)=>{
    expect(getJarStatus({...base,savedAmount:saved})).toBe(status);
  });
});
describe("getProgressPercent",()=>{
  const base:Jar={id:"j1",name:"T",emoji:"🫙",targetAmount:100,savedAmount:0,deposits:[],createdAt:"2024-01-01"};
  it.each([[0,0],[50,50],[100,100],[150,100]] as const)("saved %i gives %i%%",(saved,expected)=>{
    expect(getProgressPercent({...base,savedAmount:saved})).toBe(expected);
  });
  it("guards zero target",()=>expect(getProgressPercent({...base,targetAmount:0})).toBe(0));
});
describe("formatters",()=>{
  it("formats currency",()=>{
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(500)).toBe("$500.00");
    expect(formatCurrency(12.5)).toBe("$12.50");
  });
  it("formats date",()=>{
    expect(formatDate("")).toBe("—");
    expect(formatDate("bad")).toBe("—");
    expect(formatDate("2024-06-15")).toMatch(/Jun.*15.*2024/);
  });
});
