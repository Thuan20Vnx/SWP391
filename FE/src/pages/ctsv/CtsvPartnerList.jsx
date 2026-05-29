import React, { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { fetchCtsvPartners } from '../../services/ctsvApi';

const statusLabel = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' };

const CtsvPartnerList = () => {
  const { showToast } = useOutletContext() || {};
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    fetchCtsvPartners()
      .then((d) => setPartners(d.partners || []))
      .catch(() => showToast?.('Không tải đối tác.', 'error'));
  }, [showToast]);

  return (
    <div className="ctsv-page">
      <div className="ctsv-page-header">
        <div>
          <h1>Quản lý đối tác</h1>
          <p>Xét duyệt và quản lý đối tác tài trợ sự kiện.</p>
        </div>
        <Link to="/ctsv/partners/new" className="ctsv-btn-primary">
          Thêm đối tác
        </Link>
      </div>

      <div className="ctsv-table-wrap">
        <table className="ctsv-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Email</th>
              <th>Đại diện</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {partners.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.email}</td>
                <td>{p.representative}</td>
                <td>{statusLabel[p.status] || p.status}</td>
                <td>
                  <Link to={`/ctsv/partners/${p._id}`} className="ctsv-link-btn">
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CtsvPartnerList;
