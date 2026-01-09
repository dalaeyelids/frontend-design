import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Layout, Plus, Calendar, Search, Bell, MoreHorizontal, Folder, 
  PieChart, Users, Settings, ChevronRight, Clock, CheckCircle2, 
  AlertCircle, ChevronDown, Hash, Layers, Box, Component, Cpu, 
  X, ArrowRight, Save, Trash2, FileText, Activity, ChevronUp,
  BarChart3, Edit, Share2, Truck, ClipboardCheck, TrendingUp,
  Package, Ruler, DollarSign, Factory, ClipboardList, Filter,
  RefreshCw, MapPin, Check, ArrowLeft, RotateCcw, Loader2
} from 'lucide-react';

// --- 模拟数据生成器 (项目管理) ---
const generateHierarchyData = (projectId) => {
  return Array.from({ length: 4 }, (_, mIdx) => ({
    id: `m-${projectId}-${mIdx}`,
    type: 'machine',
    code: `M-${100 + mIdx}`,
    name: ['主控单元', '液压系统', '传动装置', '冷却塔'][mIdx] || `设备单元 ${mIdx + 1}`,
    status: mIdx === 0 ? 'risk' : 'normal',
    manager: "张工",
    lastMaintenance: "2023-11-05",
    description: "核心动力传输设备，需每月例行检查。",
    assemblies: Array.from({ length: 5 }, (_, aIdx) => ({
      id: `a-${projectId}-${mIdx}-${aIdx}`,
      type: 'assembly',
      code: `ASY-${200 + aIdx}`,
      name: ['齿轮箱总成', '活塞组件', '电路板模组', '传感器套件', '阀门组'][aIdx] || `组件 ${aIdx + 1}`,
      supplier: "博世自动化",
      supplierContact: "李经理 (138-xxxx-xxxx)",
      qcStatus: Math.random() > 0.9 ? "Pending" : "Passed",
      version: "V2.1",
      description: "包含关键精密部件，注意防尘。",
      parts: Array.from({ length: 6 }, (_, pIdx) => ({
        id: `p-${projectId}-${mIdx}-${aIdx}-${pIdx}`,
        type: 'part',
        code: `PRT-${5000 + pIdx}`,
        name: `精密零件 ${String.fromCharCode(65 + pIdx)}-${pIdx * 10}`,
        stock: Math.floor(Math.random() * 100),
        minStock: 20,
        status: Math.random() > 0.8 ? 'low_stock' : 'normal',
        price: (Math.random() * 100).toFixed(2),
        material: "304不锈钢",
        weight: "1.2kg",
        dimensions: "10x20x5mm"
      }))
    }))
  }));
};

const INITIAL_PROJECTS = [
  { id: 1, title: "Q4 财务审计系统重构", client: "内部财务部", status: "进行中", progress: 65, startDate: "2023-12-10", description: "全面升级财务核心结算模块，对接新银行接口。", teamMembers: 5 },
  { id: 2, title: "以及物流追踪平台 V2.0", client: "顺丰速运", status: "已完成", progress: 100, startDate: "2023-12-01", description: "优化地图路由算法，提升最后一公里配送效率。", teamMembers: 8 },
  { id: 4, title: "大数据驾驶舱大屏设计", client: "CEO 办公室", status: "进行中", progress: 45, startDate: "2024-01-15", description: "实时可视化全集团业务数据。", teamMembers: 4 },
  { id: 5, title: "春季营销活动 H5 矩阵", client: "市场部", status: "风险", progress: 30, startDate: "2024-02-01", description: "包含3个互动小游戏和抽奖系统的开发。", teamMembers: 6 }
];

// --- 订单追踪模拟 API ---
const MockAPI = {
  getYears: async () => new Promise(r => setTimeout(() => r(['2023', '2024']), 300)),
  getSuppliers: async (year) => new Promise(r => setTimeout(() => r(
    year === '2023' ? ['博世自动化', '西门子工业', '施耐德电气'] : ['博世自动化', '华为技术', 'ABB']
  ), 300)),
  getOrders: async (supplier) => new Promise(r => setTimeout(() => {
    const map = {
      '博世自动化': ['PO-2023-001', 'PO-2023-089'],
      '西门子工业': ['PO-SIEM-992'],
      '施耐德电气': ['PO-SCH-221'],
      '华为技术': ['PO-HW-888', 'PO-HW-999'],
      'ABB': ['PO-ABB-123']
    };
    r(map[supplier] || []);
  }, 300)),
  getBatches: async (order) => new Promise(r => setTimeout(() => r([`Batch-${order}-A`, `Batch-${order}-B`]), 300)),
  getMachines: async (batch) => new Promise(r => setTimeout(() => r([`Machine-X1 (${batch})`, `Machine-Z9 (${batch})`]), 300)),
  getProducts: async (machine) => new Promise(r => setTimeout(() => r([
    { id: 101, name: '高精度伺服电机', sku: 'MTR-2000X', quantity: 50, unit: '台', status: '已入库', deliveryDate: '2024-03-15' },
    { id: 102, name: '工业控制芯片组', sku: 'IC-9900-PRO', quantity: 2000, unit: '片', status: '运输中', deliveryDate: '2024-03-20' },
    { id: 103, name: '液压泵密封圈', sku: 'SEAL-RUB-55', quantity: 500, unit: '包', status: '质检中', deliveryDate: '2024-03-18' },
  ]), 500)),
};

// --- Order Tracking 组件 (异步树形版) ---
const OrderTrackingView = () => {
  // 树节点结构: { id, label, type, children: [], isLoading: bool, isExpanded: bool, parentId }
  const [treeNodes, setTreeNodes] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [resultLoading, setResultLoading] = useState(false);

  // 初始化加载年份
  useEffect(() => {
    const loadYears = async () => {
      const years = await MockAPI.getYears();
      const nodes = years.map(y => ({
        id: `year-${y}`,
        label: y,
        type: 'year',
        children: [],
        isLoading: false,
        isExpanded: false,
        data: y // 原始数据
      }));
      setTreeNodes(nodes);
    };
    loadYears();
  }, []);

  // 核心：处理节点点击/展开
  const handleToggleNode = async (nodeId) => {
    // 递归查找并更新节点的辅助函数
    const updateNodeInTree = (nodes, targetId, updater) => {
      return nodes.map(node => {
        if (node.id === targetId) return updater(node);
        if (node.children && node.children.length > 0) {
          return { ...node, children: updateNodeInTree(node.children, targetId, updater) };
        }
        return node;
      });
    };

    // 查找当前节点
    const findNode = (nodes, targetId) => {
      for (const node of nodes) {
        if (node.id === targetId) return node;
        if (node.children) {
          const found = findNode(node.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const node = findNode(treeNodes, nodeId);
    if (!node) return;

    // 如果是叶子节点 (Machine)，直接选中并加载数据
    if (node.type === 'machine') {
      setSelectedNodeId(nodeId);
      setResultLoading(true);
      const products = await MockAPI.getProducts(node.data);
      setResultData({
        machine: node.label,
        products
      });
      setResultLoading(false);
      return;
    }

    // 如果已经展开，则折叠
    if (node.isExpanded) {
      setTreeNodes(prev => updateNodeInTree(prev, nodeId, n => ({ ...n, isExpanded: false })));
      return;
    }

    // 如果未展开且已有子节点，直接展开
    if (node.children && node.children.length > 0) {
      setTreeNodes(prev => updateNodeInTree(prev, nodeId, n => ({ ...n, isExpanded: true })));
      return;
    }

    // 如果未展开且无子节点，需要加载数据
    setTreeNodes(prev => updateNodeInTree(prev, nodeId, n => ({ ...n, isLoading: true })));

    let childrenData = [];
    let childType = '';
    
    try {
      if (node.type === 'year') {
        childrenData = await MockAPI.getSuppliers(node.data);
        childType = 'supplier';
      } else if (node.type === 'supplier') {
        childrenData = await MockAPI.getOrders(node.data);
        childType = 'order';
      } else if (node.type === 'order') {
        childrenData = await MockAPI.getBatches(node.data);
        childType = 'batch';
      } else if (node.type === 'batch') {
        childrenData = await MockAPI.getMachines(node.data);
        childType = 'machine';
      }

      const newChildren = childrenData.map((d, idx) => ({
        id: `${childType}-${d}-${idx}`, // 简单生成唯一ID
        label: d,
        type: childType,
        children: [],
        isLoading: false,
        isExpanded: false,
        data: d
      }));

      setTreeNodes(prev => updateNodeInTree(prev, nodeId, n => ({ 
        ...n, 
        isLoading: false, 
        isExpanded: true, 
        children: newChildren 
      })));

    } catch (e) {
      console.error(e);
      setTreeNodes(prev => updateNodeInTree(prev, nodeId, n => ({ ...n, isLoading: false })));
    }
  };

  // 递归渲染树节点
  const renderTree = (nodes) => {
    return nodes.map(node => (
      <div key={node.id} className="pl-4 relative">
        {/* 连接线 */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
        
        <div 
          onClick={(e) => { e.stopPropagation(); handleToggleNode(node.id); }}
          className={`relative flex items-center gap-2 py-2 px-2 pr-4 rounded-lg cursor-pointer transition-all border border-transparent
            ${selectedNodeId === node.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}
          `}
        > 
           {/* 连接横线 */}
           <div className="absolute -left-4 top-1/2 w-4 h-px bg-slate-200" />

           {/* 展开图标 / 加载中 */}
           <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
             {node.isLoading ? (
               <Loader2 size={14} className="animate-spin text-indigo-500" />
             ) : node.type === 'machine' ? (
               <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div> // 叶子节点无图标
             ) : (
               node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
             )}
           </div>

           {/* 类型图标 */}
           <div className={`p-1 rounded ${selectedNodeId === node.id ? 'bg-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
              {node.type === 'year' && <Calendar size={14}/>}
              {node.type === 'supplier' && <Factory size={14}/>}
              {node.type === 'order' && <FileText size={14}/>}
              {node.type === 'batch' && <Layers size={14}/>}
              {node.type === 'machine' && <Cpu size={14}/>}
           </div>

           <span className="truncate text-sm">{node.label}</span>
        </div>

        {/* 子节点渲染 */}
        {node.isExpanded && node.children && (
          <div className="animate-fade-in-down origin-top">
            {renderTree(node.children)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex h-full bg-white animate-fade-in overflow-hidden">
      
      {/* 左侧：异步数据树 */}
      <div className="w-80 border-r border-slate-200 flex flex-col bg-slate-50/30">
        <div className="p-4 border-b border-slate-100 bg-white">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Filter size={18} className="text-indigo-600"/> 数据导航
          </h2>
          <p className="text-xs text-slate-500 mt-1">点击展开各层级以查找订单</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
           {/* 根节点不需要左侧padding和连线，特殊处理 */}
           <div className="-ml-4">
             {renderTree(treeNodes)}
           </div>
           
           {treeNodes.length === 0 && (
             <div className="flex justify-center p-4">
               <Loader2 className="animate-spin text-slate-400"/>
             </div>
           )}
        </div>
      </div>

      {/* 右侧：结果展示区 */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedNodeId ? (
          <>
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-start bg-slate-50/50">
               <div>
                 <div className="flex items-center gap-2 mb-1">
                   <div className="bg-green-100 text-green-700 p-1.5 rounded-lg">
                     <ClipboardList size={20} />
                   </div>
                   <h2 className="text-xl font-bold text-slate-800">订单商品明细</h2>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-mono">
                      {resultData?.machine || 'Loading...'}
                    </span>
                 </div>
               </div>
               <div className="flex gap-2">
                 <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm text-sm font-medium transition-colors">
                   <RefreshCw size={16}/> 刷新
                 </button>
                 <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm text-sm font-medium transition-colors">
                   <Share2 size={16}/> 导出
                 </button>
               </div>
            </div>

            <div className="flex-1 p-8 overflow-hidden bg-slate-50">
              {resultLoading ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={48} className="animate-spin mb-4 text-indigo-300"/>
                    <p>正在加载商品数据...</p>
                 </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden animate-scale-in">
                  <div className="overflow-y-auto flex-1">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white sticky top-0 z-10 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-6 py-4 font-medium">SKU 编号</th>
                          <th className="px-6 py-4 font-medium">商品名称</th>
                          <th className="px-6 py-4 font-medium">订单数量</th>
                          <th className="px-6 py-4 font-medium">状态</th>
                          <th className="px-6 py-4 font-medium">预计交付</th>
                          <th className="px-6 py-4 font-medium text-right">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resultData?.products.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-slate-600">{item.sku}</td>
                            <td className="px-6 py-4 font-medium text-slate-800">{item.name}</td>
                            <td className="px-6 py-4 text-slate-600">{item.quantity} {item.unit}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border
                                ${item.status === '已入库' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  item.status === '运输中' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                                  'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{item.deliveryDate}</td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs hover:underline">查看物流</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-3 border-t border-slate-200 bg-slate-50 text-right text-xs text-slate-400">
                     共检索到 {resultData?.products.length} 条记录
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <Search size={48} className="opacity-20 text-slate-500"/>
            </div>
            <h3 className="text-lg font-medium text-slate-600">准备就绪</h3>
            <p className="max-w-xs text-center mt-2 text-slate-400">请在左侧导航栏展开层级，并选择一个最终的 <span className="font-mono bg-slate-100 px-1 rounded text-slate-500">设备 (Machine)</span> 节点以查看报表。</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 辅助组件定义 ---

const NavItem = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600"></div>}
  </button>
);

const ProjectCard = ({ project, onOpenHierarchy }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
    <div className="flex justify-between mb-3">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.status === '进行中' ? 'bg-blue-100 text-blue-700' : project.status === '风险' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
        {project.status}
      </span>
      <MoreHorizontal size={18} className="text-slate-400 cursor-pointer hover:text-indigo-600"/>
    </div>
    <h3 onClick={onOpenHierarchy} className="font-bold text-slate-800 text-lg mb-1 cursor-pointer group-hover:text-indigo-600 transition-colors">
      {project.title}
    </h3>
    <p className="text-sm text-slate-500 mb-4">{project.client}</p>
    <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center">
      <div className="text-xs text-slate-400">{project.startDate}</div>
      <button 
        onClick={onOpenHierarchy} 
        className="flex items-center gap-1 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
      >
        <Layers size={14}/> 结构视图
      </button>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
    <Activity size={64} className="mb-4 opacity-20"/>
    <p>请从左侧树形菜单选择一项以查看详情</p>
  </div>
);

// --- 树形导航节点组件 (Tree Browser) ---
const TreeNode = ({ item, level = 0, selectedId, onSelect, expandedIds, toggleExpand }) => {
  const hasChildren = (item.assemblies && item.assemblies.length > 0) || (item.parts && item.parts.length > 0);
  const isExpanded = expandedIds.includes(item.id);
  const isSelected = selectedId === item.id;
  
  const getIcon = () => {
    if (item.type === 'machine') return <Cpu size={14} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />;
    if (item.type === 'assembly') return <Box size={14} className={isSelected ? 'text-blue-600' : 'text-slate-400'} />;
    return <Component size={14} className={isSelected ? 'text-emerald-600' : 'text-slate-400'} />;
  };

  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors text-sm
          ${isSelected ? 'bg-indigo-50 border-r-2 border-indigo-600' : 'hover:bg-slate-100 border-r-2 border-transparent'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(item)}
      >
        <div 
          className={`p-0.5 rounded-sm hover:bg-slate-200 transition-colors ${hasChildren ? 'visible' : 'invisible'}`}
          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
        >
          {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
        </div>
        {getIcon()}
        <span className={`truncate ${isSelected ? 'font-medium text-indigo-900' : 'text-slate-600'}`}>
          {item.name}
        </span>
      </div>
      
      {isExpanded && hasChildren && (
        <div>
          {item.assemblies?.map(child => (
            <TreeNode 
              key={child.id} 
              item={child} 
              level={level + 1} 
              selectedId={selectedId} 
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
          {item.parts?.map(child => (
            <TreeNode 
              key={child.id} 
              item={child} 
              level={level + 1} 
              selectedId={selectedId} 
              onSelect={onSelect}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- 工作区内容组件 (Master-Detail Workspace) ---
const Workspace = ({ selectedItem, projectTitle, breadcrumbs, onUpdate, onNavigate }) => {
  if (!selectedItem) return <EmptyState />;

  const renderField = (label, value, key, type = "text") => (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      <input 
        type={type}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all hover:bg-white"
        value={value || ''}
        onChange={(e) => onUpdate({...selectedItem, [key]: e.target.value})}
      />
    </div>
  );

  // --- 面板渲染逻辑 ---
  const renderMachinePanel = () => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-100">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-indigo-500"/> 健康度监控</h4>
          <div className="h-32 bg-slate-50 rounded flex items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200">
            [ 实时 OEE 效率曲线图 ]
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> 运行: 98%</span>
            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> 待机: 2%</span>
          </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><PieChart size={18} className="text-indigo-500"/> 维护记录</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer">
              <span className="text-slate-600">2023-11-01</span>
              <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">例行保养完成</span>
            </div>
            <div className="flex items-center justify-between text-sm p-2 hover:bg-slate-50 rounded transition-colors cursor-pointer">
              <span className="text-slate-600">2023-10-15</span>
              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-xs">更换滤芯</span>
            </div>
            <button className="w-full mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium py-1">查看完整日志</button>
          </div>
      </div>
    </section>
  );

  const renderAssemblyPanel = () => (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up delay-100">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Truck size={64}/></div>
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Factory size={18} className="text-blue-500"/> 供应链信息</h4>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400">供应商 (Supplier)</label>
              <div className="font-medium text-slate-800">{selectedItem.supplier}</div>
            </div>
            <div>
              <label className="text-xs text-slate-400">联系人</label>
              <div className="text-sm text-slate-600">{selectedItem.supplierContact || 'N/A'}</div>
            </div>
            <div className="flex gap-2 mt-2">
              <button className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium text-slate-600 transition-colors">联系供应商</button>
              <button className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded text-xs font-medium text-slate-600 transition-colors">查看合同</button>
            </div>
          </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><ClipboardCheck size={18} className="text-blue-500"/> 质量检验 (QC)</h4>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold border-4 
              ${selectedItem.qcStatus === 'Passed' ? 'border-green-100 text-green-600 bg-green-50' : 'border-yellow-100 text-yellow-600 bg-yellow-50'}`}>
              {selectedItem.qcStatus === 'Passed' ? 'PASS' : 'PEND'}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-800">当前批次质检状态</div>
              <div className="text-xs text-slate-500">检测日期: 2024-03-20</div>
            </div>
          </div>
          <button className="w-full px-3 py-2 border border-slate-200 hover:border-blue-500 text-slate-600 hover:text-blue-600 rounded text-sm font-medium transition-colors">
            发起新一轮质检
          </button>
      </div>
    </section>
  );

  const renderPartPanel = () => (
    <div className="space-y-6 animate-fade-in-up delay-100">
      {/* 物理规格 */}
      <section className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="bg-white p-2 rounded text-slate-400"><Package size={20}/></div>
               <div>
                 <div className="text-xs text-slate-400">材质</div>
                 <div className="text-sm font-medium text-slate-700">{selectedItem.material}</div>
               </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2">
               <div className="bg-white p-2 rounded text-slate-400"><Ruler size={20}/></div>
               <div>
                 <div className="text-xs text-slate-400">尺寸</div>
                 <div className="text-sm font-medium text-slate-700">{selectedItem.dimensions}</div>
               </div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex items-center gap-2">
               <div className="bg-white p-2 rounded text-slate-400"><Activity size={20}/></div>
               <div>
                 <div className="text-xs text-slate-400">重量</div>
                 <div className="text-sm font-medium text-slate-700">{selectedItem.weight}</div>
               </div>
            </div>
         </div>
         <button className="text-xs text-indigo-600 font-medium hover:underline">下载规格书 PDF</button>
      </section>

      {/* 库存与价格双栏 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Box size={18} className="text-emerald-500"/> 库存控制中心</h4>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-bold text-slate-800">{selectedItem.stock} <span className="text-sm font-normal text-slate-400">pcs</span></span>
              <span className={`text-xs px-2 py-1 rounded font-medium ${selectedItem.stock < selectedItem.minStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {selectedItem.stock < selectedItem.minStock ? '库存不足' : '库存充足'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
               <div className={`h-full rounded-full ${selectedItem.stock < selectedItem.minStock ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(selectedItem.stock, 100)}%`}}></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus size={16}/> 入库登记
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 rounded-lg text-sm font-medium transition-colors">
                出库/领料
              </button>
            </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> 采购成本趋势</h4>
            <div className="flex items-center justify-between mb-4">
               <div>
                 <div className="text-xs text-slate-400">最新单价</div>
                 <div className="text-2xl font-bold text-slate-800">¥{selectedItem.price}</div>
               </div>
               <div className="text-right">
                 <div className="text-xs text-slate-400">较上月</div>
                 <div className="text-sm font-medium text-red-500 flex items-center justify-end gap-1"><TrendingUp size={12}/> +2.4%</div>
               </div>
            </div>
            <div className="h-24 bg-slate-50 border border-dashed border-slate-200 rounded flex items-center justify-center text-xs text-slate-400">
               [ 12个月价格波动折线图 ]
            </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white animate-fade-in">
      {/* 顶部操作栏 */}
      <div className="h-16 border-b border-slate-200 px-8 flex items-center justify-between bg-white flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{projectTitle}</span>
            {breadcrumbs.map(b => (
              <React.Fragment key={b.id}>
                <ChevronRight size={10} />
                <span>{b.code}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {selectedItem.type === 'machine' && <Cpu className="text-indigo-600" />}
              {selectedItem.type === 'assembly' && <Factory className="text-blue-600" />}
              {selectedItem.type === 'part' && <Component className="text-emerald-600" />}
              {selectedItem.name}
            </h2>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border
              ${selectedItem.status === 'risk' || selectedItem.status === 'low_stock' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}
            `}>
              {selectedItem.status === 'risk' ? '风险' : selectedItem.status === 'low_stock' ? '库存预警' : '正常运行'}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm transition-colors border border-slate-200">
            <Share2 size={16} /> 分享
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium shadow-sm transition-all active:scale-95">
            <Save size={16} /> 保存变更
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* A. 核心属性表单 (通用) */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b 
              ${selectedItem.type === 'machine' ? 'from-indigo-500 to-indigo-600' : 
                selectedItem.type === 'assembly' ? 'from-blue-500 to-blue-600' : 
                'from-emerald-500 to-emerald-600'}`}>
            </div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-slate-400"/> 核心属性
              </h3>
              <button className="text-slate-400 hover:text-indigo-600"><Edit size={16}/></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderField("项目编号", selectedItem.code, "code")}
              {renderField("当前版本", selectedItem.version || "V1.0", "version")}
              {selectedItem.type === 'machine' && renderField("负责人", selectedItem.manager, "manager")}
              {selectedItem.type === 'assembly' && renderField("供应商", selectedItem.supplier, "supplier")}
              {selectedItem.type === 'part' && renderField("材质", selectedItem.material, "material")}
              
              <div className="col-span-1 md:col-span-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">详细描述</label>
                <textarea 
                  className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                  value={selectedItem.description || ''}
                  onChange={(e) => onUpdate({...selectedItem, description: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* B. 数据列表 (仅 Machine 和 Assembly 有子级) */}
          {(selectedItem.assemblies || selectedItem.parts) && (
            <section className="animate-fade-in-up delay-75">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                  {selectedItem.assemblies ? <Box size={20} className="text-blue-500"/> : <Component size={20} className="text-emerald-500"/>}
                  {selectedItem.assemblies ? '下属组件清单' : '包含零件明细'}
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-2">
                    {selectedItem.assemblies ? selectedItem.assemblies.length : selectedItem.parts.length} Items
                  </span>
                </h3>
                <div className="flex gap-2">
                   <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input type="text" placeholder="过滤列表..." className="pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none w-48"/>
                   </div>
                   <button className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-sm font-medium transition-colors">
                     <Plus size={16} /> 新增
                   </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">编号</th>
                      <th className="px-6 py-3 font-medium">名称</th>
                      <th className="px-6 py-3 font-medium">状态</th>
                      <th className="px-6 py-3 font-medium">{selectedItem.assemblies ? '供应商' : '库存'}</th>
                      <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedItem.assemblies || selectedItem.parts).map((child) => (
                      <tr 
                        key={child.id} 
                        onClick={() => onNavigate && onNavigate(child)}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-3 font-mono text-slate-600">{child.code}</td>
                        <td className="px-6 py-3 font-medium text-slate-800 flex items-center gap-2">
                           {child.type === 'assembly' ? <Factory size={14} className="text-blue-400"/> : <Component size={14} className="text-emerald-400"/>}
                           {child.name}
                        </td>
                        <td className="px-6 py-3">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                             ${child.status === 'low_stock' || child.status === 'risk' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}
                           `}>
                             {child.status === 'low_stock' ? '缺货' : '正常'}
                           </span>
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {child.stock !== undefined ? (
                            <div className="flex items-center gap-2 w-24">
                              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${child.stock < 20 ? 'bg-red-400' : 'bg-emerald-400'}`} style={{width: `${Math.min(child.stock, 100)}%`}}></div>
                              </div>
                              <span className="text-xs w-6 text-right">{child.stock}</span>
                            </div>
                          ) : (
                            child.supplier || '-'
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button className="text-indigo-600 hover:text-indigo-800 font-medium text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                            查看
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* C. 针对性业务面板 (Machine / Assembly / Part 各自不同) */}
          {selectedItem.type === 'machine' && renderMachinePanel()}
          {selectedItem.type === 'assembly' && renderAssemblyPanel()}
          {selectedItem.type === 'part' && renderPartPanel()}
          
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
};

// --- 主组件 (Tree-Detail Modal Wrapper) ---
const TreeBrowserModal = ({ project, onClose }) => {
  const [hierarchyData, setHierarchyData] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedIds, setExpandedIds] = useState([]);

  useEffect(() => {
    if (project) {
      const data = generateHierarchyData(project.id);
      setHierarchyData(data);
      if (data.length > 0) {
        setSelectedItem(data[0]); 
        setExpandedIds([data[0].id]); 
      }
    }
  }, [project]);

  const toggleExpand = (id) => {
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };
  
  // 处理从右侧列表点击进入子项
  const handleNavigate = (childItem) => {
    // 自动展开当前父节点
    if (selectedItem && !expandedIds.includes(selectedItem.id)) {
      setExpandedIds(prev => [...prev, selectedItem.id]);
    }
    setSelectedItem(childItem);
  };

  const getBreadcrumbs = () => {
    if (!selectedItem) return [];
    const crumbs = [];
    if (selectedItem.type === 'part') {
      crumbs.push({ id: 'mock-m', code: 'Machine' }, { id: 'mock-a', code: 'Assembly' });
    } else if (selectedItem.type === 'assembly') {
      crumbs.push({ id: 'mock-m', code: 'Machine' });
    }
    return crumbs;
  };

  const handleUpdateItem = (updated) => {
    setSelectedItem(updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-scale-in">
      <div className="bg-white w-full max-w-[95vw] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-900/10">
        
        {/* Modal 顶部 */}
        <div className="h-14 bg-slate-900 text-white flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-indigo-500 p-1.5 rounded text-white"><Folder size={16}/></div>
             <div>
                <div className="font-bold text-sm opacity-90">{project.title}</div>
                <div className="text-[10px] opacity-60">工程浏览器 (Structure View)</div>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* 双栏布局 */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 左侧：树形导航 */}
          <div className="w-[280px] bg-slate-50 border-r border-slate-200 flex flex-col flex-shrink-0">
             <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white/50">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">Structure</span>
               <div className="flex gap-1">
                 <button className="p-1 hover:bg-slate-200 rounded text-slate-400" title="Collapse All"><ChevronUp size={14}/></button>
                 <button className="p-1 hover:bg-slate-200 rounded text-slate-400" title="Add Node"><Plus size={14}/></button>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto py-2">
               {hierarchyData.map(machine => (
                 <TreeNode 
                   key={machine.id} 
                   item={machine} 
                   selectedId={selectedItem?.id}
                   onSelect={setSelectedItem}
                   expandedIds={expandedIds}
                   toggleExpand={toggleExpand}
                 />
               ))}
               <div className="h-10"></div>
             </div>

             <div className="p-3 border-t border-slate-200 bg-slate-100 text-[10px] text-slate-400 text-center">
               Last synced: 10 mins ago
             </div>
          </div>

          {/* 右侧：工作台 */}
          <Workspace 
            selectedItem={selectedItem}
            projectTitle={project.title}
            breadcrumbs={getBreadcrumbs()}
            onUpdate={handleUpdateItem}
            onNavigate={handleNavigate}
          />

        </div>
      </div>
    </div>
  );
};

// --- ERP 主入口组件 ---
export default function ProjectManagementERP() {
  const [activeTab, setActiveTab] = useState('projects'); // 新增状态：控制当前视图 ('projects' | 'tracking')
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingProject, setViewingProject] = useState(null); 
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const groupRefs = useRef({});

  // --- Project List View 逻辑 ---
  const groupedData = useMemo(() => {
    const filtered = projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()) || p.client.toLowerCase().includes(searchTerm.toLowerCase()));
    const sorted = filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    const groups = {};
    const years = new Set(); 
    sorted.forEach(project => {
      const date = new Date(project.startDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const dateKey = `${year}年 ${month}月`;
      years.add(year);
      if (!groups[dateKey]) { groups[dateKey] = { year, month, projects: [] }; }
      groups[dateKey].projects.push(project);
    });
    return { groups, years: Array.from(years).sort((a, b) => b - a) }; 
  }, [projects, searchTerm]);

  const toggleGroup = (key) => setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const scrollToGroup = (key) => groupRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // --- 项目列表视图组件 (抽离以保持主结构清晰) ---
  const ProjectListView = () => (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10 animate-fade-in">
        <div className="flex items-center gap-4 w-1/3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="搜索项目..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>
        <div className="flex gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Bell size={20}/></button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm"><Plus size={18}/><span>新建项目</span></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative animate-fade-in">
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            <h1 className="text-2xl font-bold text-slate-800 mb-8">项目列表</h1>
            <div className="space-y-8 pb-20">
              {Object.entries(groupedData.groups).map(([dateKey, groupData]) => (
                <div key={dateKey} ref={el => groupRefs.current[dateKey] = el}>
                  <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-3 mb-4 flex items-center gap-3 cursor-pointer select-none" onClick={() => toggleGroup(dateKey)}>
                      <div className="p-1.5 bg-white border border-slate-200 rounded-md text-indigo-600 shadow-sm">{collapsedGroups[dateKey] ? <ChevronRight size={18}/> : <ChevronDown size={18}/>}</div>
                      <h2 className="text-lg font-bold text-slate-700">{groupData.year}年 <span className="text-slate-900">{groupData.month}月</span></h2>
                      <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  {!collapsedGroups[dateKey] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groupData.projects.map(project => (
                        <ProjectCard key={project.id} project={project} onOpenHierarchy={() => setViewingProject(project)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
        </div>
        <div className="hidden lg:flex w-48 bg-white border-l border-slate-200 flex-col overflow-y-auto">
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white font-semibold text-sm text-slate-500">快速导航</div>
            <div className="p-3 space-y-2">
              {Object.keys(groupedData.groups).map(key => (
                <button key={key} onClick={() => scrollToGroup(key)} className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded-md transition-colors">{key}</button>
              ))}
            </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3"><span className="text-white font-bold text-lg">E</span></div>
          <span className="text-xl font-bold text-slate-800">Nexus ERP</span>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          <NavItem 
            icon={<Folder size={20} />} 
            label="项目管理" 
            active={activeTab === 'projects'} 
            onClick={() => setActiveTab('projects')}
          />
          <NavItem 
            icon={<ClipboardList size={20} />} 
            label="订单追踪" 
            active={activeTab === 'tracking'} 
            onClick={() => setActiveTab('tracking')}
          />
          <NavItem icon={<Users size={20} />} label="团队资源" />
          <NavItem icon={<Layout size={20} />} label="系统报表" />
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* 根据 activeTab 渲染不同视图 */}
        {activeTab === 'projects' ? <ProjectListView /> : <OrderTrackingView />}
      </main>

      {/* 弹窗组件 */}
      {viewingProject && <TreeBrowserModal project={viewingProject} onClose={() => setViewingProject(null)} />}
    </div>
  );
}